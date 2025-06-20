import { useState, useCallback } from "react";
import { languageOptions, startingCodeTemplates } from "../constants";
import { useUser } from "@clerk/clerk-react";
import { getProbId } from "../utils/url";

interface SubmissionResult {
  status: "accept" | "fail" | "error";
  message: string;
  executionTime?: number;
  coinsEarned?: number;
  TestCases?: number;
  totalCases?: number;
}
type UseCodeExecutionProps = {
  difficulty: number;
};
export function useCodeExecution({ difficulty }: UseCodeExecutionProps) {
  const [code, setCode] = useState(startingCodeTemplates.javascript);
  const [selectedLanguage, setSelectedLanguage] = useState(languageOptions[0]);
  const [results, setResults] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [submissionResult, setSubmissionResult] =
    useState<SubmissionResult | null>(null);

  const { user } = useUser();
  const probId = getProbId();

  const handleRunCode = useCallback(async () => {
    setResults(null);
    setConsoleOutput([]);
    setIsExecuting(true);

    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }

    setConsoleOutput((prev) => [...prev, "Executing code..."]);

    try {
      const payload = {
        language: selectedLanguage.value,
        code: code,
      };
      console.log("Sending request with payload:", payload);
      setConsoleOutput((prev) => [...prev, "Processing..."]);

      const response = await fetch("/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data.job_id) {
        throw new Error("No job ID received from server");
      }

      const jobId = data.job_id;
      setConsoleOutput((prev) => [...prev, "Waiting for results..."]);

      const newTimeoutId = setTimeout(() => {
        setConsoleOutput((prev) => [
          ...prev,
          "Execution is taking longer than expected...",
          "You can try running the code again or wait a bit longer.",
        ]);
        setResults({
          success: false,
          message: "Execution is taking longer than expected",
        });
        setIsExecuting(false);
      }, 30000);

      setTimeoutId(newTimeoutId);

      const pollInterval = setInterval(async () => {
        try {
          const resultResponse = await fetch(`/result/${jobId}`);
          if (!resultResponse.ok) {
            throw new Error(`Result polling failed: ${resultResponse.status}`);
          }

          const resultData = await resultResponse.json();
          //console.log("Polling result:", resultData);
          if (
            resultData.status === "completed" ||
            resultData.status === "success" ||
            resultData.status === "accept"
          ) {
            clearInterval(pollInterval);
            clearTimeout(newTimeoutId);
            setTimeoutId(null);

            const formattedOutput: string[] = [];

            if (resultData.output) {
              let cleanOutput = resultData.output
                .replace(/Fetching code from:[^\n]*\n?/g, "")
                .replace(/Executing file:[^\n]*\n?/g, "")
                .replace(/Compiling file:[^\n]*\n?/g, "")
                .replace(/Executing compiled program\s*/g, "")
                .replace(/STDOUT:\s*/g, "")
                .replace(/STDERR:\s*/g, "")
                .replace(/^python\s+/gm, "") // use multiline mode
                .replace(/^g\+\+ .*$/gm, "")
                .replace(/^cc .*$/gm, "")
                .replace(/^gcc .*$/gm, "")
                .replace(/[\t\r\n ]+/g, " ") // reduces any whitespace chars to a single space
                .trim();

              if (cleanOutput) {
                formattedOutput.push(cleanOutput);
              }
            }

            if (resultData.error && resultData.error !== "None") {
              let cleanError = resultData.error
                .replace(/STDERR:\s*/g, "")
                .replace(/^g\+\+\s+[^\n]*\n?/gm, "")
                .replace(/^cc\s+[^\n]*\n?/gm, "")
                .replace(/^gcc\s+[^\n]*\n?/gm, "")
                .trim();

              if (cleanError) {
                formattedOutput.push(`Error: ${cleanError}`);
              }
            }

            if (resultData.exec_time_ms) {
              formattedOutput.push(
                `Execution time: ${resultData.exec_time_ms}ms`
              );
            }

            setConsoleOutput((prev) =>
              [
                ...prev.filter((line) => !line.includes("Status: pending")),
                ...formattedOutput,
              ].filter(Boolean)
            );

            setResults({
              success: !resultData.error,
              message: resultData.error
                ? `Code execution failed: ${resultData.error}`
                : "Code executed successfully",
            });
            setIsExecuting(false);
            return;
          } else if (resultData.status === "error") {
            clearInterval(pollInterval);
            setConsoleOutput((prev) => [
              ...prev,
              `Error: ${resultData.error || "Unknown error"}`,
            ]);
            setResults({
              success: false,
              message: `Code execution failed: ${
                resultData.error || "Unknown error"
              }`,
            });
            setIsExecuting(false);
          } else {
            setConsoleOutput((prev) => [
              ...prev,
              `Status: ${resultData.status}`,
            ]);
          }
        } catch (pollError) {
          clearInterval(pollInterval);
          if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
          }
          const errorMessage =
            pollError instanceof Error
              ? pollError.message
              : "Unknown polling error";
          setConsoleOutput((prev) => [
            ...prev,
            `Error during result polling: ${errorMessage}`,
          ]);
          setResults({
            success: false,
            message: `Failed to get execution results: ${errorMessage}`,
          });
          setIsExecuting(false);
        }
      }, 1000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setConsoleOutput((prev) => [...prev, `Error: ${errorMessage}`]);
      setResults({
        success: false,
        message: `Failed to execute code: ${errorMessage}`,
      });
      setIsExecuting(false);
    }
  }, [code, selectedLanguage, timeoutId]);

  const handleSubmitCode = useCallback(async () => {
    if (!user?.id) {
      setConsoleOutput((prev) => [
        ...prev,
        "Error: You must be logged in to submit code",
      ]);
      return;
    }

    if (!probId) {
      setConsoleOutput((prev) => [...prev, "Error: No problem ID found"]);
      return;
    }

    setConsoleOutput((prev) => [...prev, "Submitting code..."]);
    setIsExecuting(true);

    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }

    try {
      const payload = {
        language: selectedLanguage.value,
        code: code,
        userId: user.id,
        probId: String(probId),
      };

      const response = await fetch("/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (!data.job_id) {
        throw new Error("No submission job ID received from server");
      }

      const jobId = data.job_id;
      setConsoleOutput((prev) => [...prev, "Waiting for submission result..."]);

      const newTimeoutId = setTimeout(() => {
        setConsoleOutput((prev) => [
          ...prev,
          "Submission is taking longer than expected...",
          "You can try submitting again later.",
        ]);
        setResults({
          success: false,
          message: "Submission is taking longer than expected",
        });
        setIsExecuting(false);
      }, 30000);

      setTimeoutId(newTimeoutId);

      const pollInterval = setInterval(async () => {
        try {
          const resultResponse = await fetch(`/result/${jobId}`);
          if (!resultResponse.ok) {
            throw new Error(`Result polling failed: ${resultResponse.status}`);
          }

          const resultData = await resultResponse.json();

          if (
            resultData.status === "completed" ||
            resultData.status === "accept" ||
            resultData.status === "fail"
          ) {
            clearInterval(pollInterval);
            clearTimeout(newTimeoutId);
            setTimeoutId(null);

            setSubmissionResult({
              status: resultData.status === "accept" ? "accept" : "fail",
              message:
                resultData.status === "accept"
                  ? "Your solution passed all test cases! Great job!"
                  : resultData.message ||
                    "Your solution failed some test cases. Please try again.",
              executionTime: resultData.exec_time_ms,
              coinsEarned: difficulty * 20, // Example calculation for coins earned
              TestCases: resultData.test_cases,
              totalCases: resultData.total_cases,
            });

            setConsoleOutput((prev) => [
              ...prev,
              `Submission ${
                resultData.status === "accept" ? "accepted" : "failed"
              }`,
            ]);

            setIsExecuting(false);
          }
        } catch (error) {
          clearInterval(pollInterval);
          clearTimeout(newTimeoutId);
          setTimeoutId(null);

          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          setConsoleOutput((prev) => [...prev, `Error: ${errorMessage}`]);
          setSubmissionResult({
            status: "fail",
            message: `Failed to submit code: ${errorMessage}`,
          });
          setIsExecuting(false);
        }
      }, 1000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setConsoleOutput((prev) => [...prev, `Error: ${errorMessage}`]);
      setSubmissionResult({
        status: "fail",
        message: `Failed to submit code: ${errorMessage}`,
      });
      setIsExecuting(false);
    }
  }, [code, selectedLanguage, timeoutId, user?.id, probId]);

  const clearSubmissionResult = useCallback(() => {
    setSubmissionResult(null);
  }, []);

  return {
    code,
    setCode,
    selectedLanguage,
    setSelectedLanguage,
    consoleOutput,
    results,
    isExecuting,
    submissionResult,
    handleRunCode,
    handleSubmitCode,
    clearSubmissionResult,
  };
}
