/**
 * The AICTE handbook rule engine lives in the shared workspace package so the
 * server and the browser wizard evaluate the exact same pure function.
 * This module is the backend's stable entry point to it.
 */
export {
  evaluateCompliance,
  requiredFacultyFor,
  complianceBand,
  severityRank,
} from "@aicte/shared";
