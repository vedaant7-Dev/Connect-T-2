"use strict";

// Load compatibility modules before server.js imports Express or creates its
// MySQL pool. Managed hosts sometimes start server.js directly instead of
// running `npm start`; keeping this bootstrap inside server.js makes both
// startup paths expose the same production API and workflow protections.
const PRODUCTION_PATCHES = [
  "./otpProductionPatch.js",
  "./profileSessionHydrationPatch.js",
  "./utilityStatusPatch.js",
  "./alertPartialUpdatePatch.js",
  "./alertGovernancePatch.js",
  "./alertMutationPatch.js",
  "./alertDeliveryPatch.js",
  "./broadcastMediaPatch.js",
  "./broadcastGovernancePatch.js",
  "./broadcastDeliveryPatch.js",
  "./complaintUploadPatch.js",
  "./complaintJsonPatch.js",
  "./communityPreflightPatch.js",
  "./communityFeedPatch.js",
  "./jobPortalSessionRecoveryPatch.js",
  "./jobPortalRoleGovernancePatch.js",
  "./jobPortalLegacyAuthBlockPatch.js",
  "./jobPortalAuthPatch.js",
  "./jobPortalOnboardingPatch.js",
  "./jobPortalMessagePatch.js",
  "./jobPortalProfilePatch.js",
];

for (const patch of PRODUCTION_PATCHES) require(patch);

module.exports = { PRODUCTION_PATCHES };
