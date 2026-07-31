"use strict";

// Load compatibility modules before server.js imports Express or creates its
// MySQL pool. Managed hosts sometimes start server.js directly instead of
// running `npm start`; keeping this bootstrap inside server.js makes both
// startup paths expose the same production API and workflow protections.
const PRODUCTION_PATCHES = [
  "./otpProductionPatch.js",
  "./profileSessionHydrationPatch.js",
  "./notificationSystemPatch.js",
  "./roleAuditDisplayLimitPatch.js",
  "./utilityStatusActionsPatch.js",
  "./utilityStatusPatch.js",
  "./nagarsevakWardAssignmentPatch.js",
  "./wardMembersPatch.js",
  "./alertPartialUpdatePatch.js",
  "./alertGovernancePatch.js",
  "./alertMutationPatch.js",
  "./alertDeliveryPatch.js",
  "./publicBroadcastSharePatch.js",
  "./broadcastMediaPatch.js",
  "./broadcastGovernancePatch.js",
  "./broadcastActionsPatch.js",
  "./broadcastDeliveryPatch.js",
  "./complaintUploadPatch.js",
  "./complaintJsonPatch.js",
  "./communityPreflightPatch.js",
  "./communityFeedPatch.js",
  "./internalCommunityAndUsersPatch.js",
  "./jobPortalUnifiedCivicAuthPatch.js",
  "./jobPortalUnifiedRolePatch.js",
  "./jobPortalLegacyAuthBlockPatch.js",
  "./jobPortalOnboardingPatch.js",
  "./jobPortalMessagePatch.js",
  "./jobPortalProfilePatch.js",
  "./jobPortalDirectCivicBypassPatch.js",
];

for (const patch of PRODUCTION_PATCHES) require(patch);

module.exports = { PRODUCTION_PATCHES };
