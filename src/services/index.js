const CaseAuditService = require('./caseAuditService');
const DocumentVersionService = require('./documentVersionService');
const NotificationDeliveryService = require('./notificationDelivery.service');
const DocumentExportService = require('./documentExport.service');
const RefundPolicyService = require('./refundPolicy.service');
const MacroService = require('./macro.service');
const FormulaService = require('./formula.service');
const ViewService = require('./view.service');
const CommandPaletteService = require('./commandPalette.service');
const CycleService = require('./cycle.service');
const SLAService = require('./sla.service');
const OmnichannelInboxService = require('./omnichannelInbox.service');
const ApprovalService = require('./approval.service');
const LifecycleService = require('./lifecycle.service');
const AutomationEngine = require('./automationEngine.service');
const UnifiedTimelineService = require('./unifiedTimeline.service');
const DealHealthService = require('./dealHealth.service');
const DealRoomService = require('./dealRoom.service');
const ReportBuilderService = require('./reportBuilder.service');
const DeduplicationService = require('./deduplication.service');
const ComplianceAuditService = require('./complianceAudit.service');

module.exports = {
    CaseAuditService,
    DocumentVersionService,
    NotificationDeliveryService,
    DocumentExportService,
    RefundPolicyService,
    MacroService,
    FormulaService,
    ViewService,
    CommandPaletteService,
    CycleService,
    SLAService,
    OmnichannelInboxService,
    ApprovalService,
    LifecycleService,
    AutomationEngine,
    UnifiedTimelineService,
    DealHealthService,
    DealRoomService,
    ReportBuilderService,
    DeduplicationService,
    ComplianceAuditService
};
