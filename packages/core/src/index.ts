// Labels
export { loadLabels, getLabelId, getLabelCode, clearLabelCache } from "./labels";
export type { Label } from "./labels";

// Search
export { buildSearchText } from "./search";

// Nodes
export { createNode, updateNode, getNode, listNodes, deleteNode } from "./nodes";
export type { CreateNodeInput, UpdateNodeInput, NodeFilters } from "./nodes";

// Edges
export { createEdge, deleteEdge, listEdges, getRelatedNodes } from "./edges";
export type { CreateEdgeInput } from "./edges";

// Events
export { createEvent } from "./events/create";
export type { CreateEventInput } from "./events/create";
export { correctEvent } from "./events/correct";
export type { CorrectionInput } from "./events/correct";
export { getActiveEventsForNode, getActiveEventsForProject } from "./events/resolve";

// Economics
export { calculateProjectEconomics } from "./economics/calculate";
export type { ProjectEconomics } from "./economics/calculate";
export { calculateRotRut } from "./economics/rot-rut";
export type {
  RotRutType,
  RotRutConfig,
  RotRutLineInput,
  RotRutResult,
} from "./economics/rot-rut";
export { getAccumulatedRotRut } from "./economics/rot-rut-tracking";
export type { AccumulatedRotRut } from "./economics/rot-rut-tracking";

// AI
export { aiGenerateObject, aiGenerateText } from "./ai/complete";
export { aiComplete } from "./ai/client";
export type { ModelTier, AiResponse } from "./ai/client";
export { buildProjectContext } from "./ai/context";
export { generateQuoteProposal } from "./ai/generate-quote";
export { classifyMessage } from "./ai/classify-message";
export type { ClassifyMessageInput } from "./ai/classify-message";
export { translateMessage } from "./ai/translate";
export type { TranslateMessageInput } from "./ai/translate";
export { getGlossaryTerms } from "./ai/glossary";
export type { GlossaryTerm } from "./ai/glossary";
export { AI_TIERS } from "./ai/config";
export type { AiTier } from "./ai/config";

// Proposals
export {
  createProposal,
  getProposal,
  getDraftProposal,
  updateProposalLine,
  rejectProposal,
} from "./proposals/store";
export {
  approveQuoteProposal,
  approveInvoiceProposal,
} from "./proposals/approve";

// Quote Tokens & Delivery
export { generateQuoteToken, verifyQuoteToken } from "./quotes/token";
export { deliverQuote } from "./quotes/deliver";

// Signing
export {
  initiateSigning,
  pollSigningStatus,
  onSigningComplete,
} from "./signing/bankid";
export type { SigningStatus, SigningInitResult, SigningPollResult } from "./signing/bankid";

// Messaging
export { resolveSender, resolveSenderWithProjects } from "./messaging/sender";
export type { ResolvedSender } from "./messaging/sender";
export { handleIncomingMessage } from "./messaging/handler";
export type { IncomingMessageInput, HandleResult } from "./messaging/handler";
export { sendMessage } from "./messaging/send";
export type { SendMessageInput, SendMessageResult } from "./messaging/send";
export { generateAndSendWorkOrder } from "./messaging/work-order";
export type { GenerateWorkOrderInput, WorkOrderResult } from "./messaging/work-order";
export { onPersonAssignedToProject } from "./messaging/triggers";

// Notifications
export {
  notifyProjectOwner,
  getUnreadNotifications,
  getUnreadCount,
  markNotificationRead,
} from "./notifications/notify";
export type { NotificationType, NotificationInput } from "./notifications/notify";
