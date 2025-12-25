import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/CopyButton";

/**
 * Request body type - can be an object with any structure
 */
type RequestBodyType =
  | Record<string, unknown>
  | Array<unknown>
  | string
  | number
  | boolean
  | null;

/**
 * Response type - can be an object, string, or other serializable types
 */
type ResponseType =
  | Record<string, unknown>
  | Array<unknown>
  | string
  | number
  | boolean
  | null;

interface ApiEndpointProps {
  method: string;
  path: string;
  description: string;
  auth?: boolean;
  adminOnly?: boolean;
  requestBody?: RequestBodyType;
  response?: ResponseType;
  baseUrl: string;
}

const ApiEndpointCard = ({
  method,
  path,
  description,
  auth,
  adminOnly,
  requestBody,
  response,
  baseUrl,
}: ApiEndpointProps) => {
  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-green-100 text-green-800 border-green-200";
      case "POST":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PUT":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "DELETE":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="rounded-lg border border-gray-600 bg-gray-700 p-3 sm:p-4">
      <div className="mb-2 flex flex-row items-center gap-2 sm:mb-3 sm:gap-3">
        <Badge className={`${getMethodColor(method)} border w-fit shrink-0`}>{method}</Badge>
        <code className="flex-1 break-all font-mono text-xs text-light-100 sm:text-sm">{path}</code>
        <CopyButton 
          text={`${baseUrl}${path}`} 
          className="shrink-0 border-blue-500 bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
        />
      </div>

      <p className="mb-2 text-xs text-light-200 sm:mb-3 sm:text-sm">{description}</p>

      <div className="mb-2 flex flex-wrap gap-2 sm:mb-3">
        {auth && (
          <Badge
            variant="outline"
            className="border-yellow-200 bg-yellow-50 text-xs text-yellow-700 sm:text-sm"
          >
            🔐 Authentication Required
          </Badge>
        )}
        {adminOnly && (
          <Badge
            variant="outline"
            className="border-red-200 bg-red-50 text-xs text-red-700 sm:text-sm"
          >
            👑 Admin Only
          </Badge>
        )}
      </div>

      {/* Request Body */}
      {requestBody && (
        <div className="mb-2 sm:mb-3">
          <h4 className="mb-1.5 text-sm font-semibold text-light-100 sm:mb-2 sm:text-base">Request Body:</h4>
          <div className="overflow-x-auto rounded bg-gray-600 p-2 sm:p-3">
            <pre className="text-xs text-light-200 sm:text-sm">
              {JSON.stringify(requestBody, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Response */}
      {response && (
        <div>
          <h4 className="mb-1.5 text-sm font-semibold text-light-100 sm:mb-2 sm:text-base">Response:</h4>
          <div className="overflow-x-auto rounded bg-gray-600 p-2 sm:p-3">
            <pre className="text-xs text-light-200 sm:text-sm">
              {typeof response === "string"
                ? response
                : JSON.stringify(response, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiEndpointCard;
