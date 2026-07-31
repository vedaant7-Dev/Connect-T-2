from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"Expected block not found in {path}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


complaint_screen = Path("mobile/app/complaint/[id].tsx")
replace_once(
    complaint_screen,
    '''  const officerActions = [
    { status: "assigned" as ComplaintStatus, label: "Assign", note: "Complaint assigned to ward officer", icon: "user-check", color: ORANGE, bg: "#FFEDD5", show: complaint.status === "submitted" },
    { status: "in_progress" as ComplaintStatus, label: "In Progress", note: "Work started on this complaint", icon: "tool", color: "#7C3AED", bg: "#EDE9FE", show: complaint.status === "submitted" || complaint.status === "assigned" },
    { status: "resolved" as ComplaintStatus, label: "Resolve", note: "Complaint resolved by ward officer", icon: "check-circle", color: "#059669", bg: "#D1FAE5", show: complaint.status === "submitted" || complaint.status === "assigned" || complaint.status === "in_progress" },
    { status: "rejected" as ComplaintStatus, label: "Reject", note: "Complaint rejected by ward officer", icon: "x-circle", color: "#DC2626", bg: "#FEE2E2", show: complaint.status === "submitted" || complaint.status === "assigned" || complaint.status === "in_progress" },
  ];''',
    '''  const officerActions = [
    { status: "assigned" as ComplaintStatus, label: "Approve", note: "Complaint approved by ward officer", icon: "check", color: "#059669", bg: "#D1FAE5", show: complaint.status === "submitted" },
    { status: "rejected" as ComplaintStatus, label: "Reject", note: "Complaint rejected by ward officer", icon: "x-circle", color: "#DC2626", bg: "#FEE2E2", show: complaint.status === "submitted" },
    { status: "in_progress" as ComplaintStatus, label: "In Progress", note: "Work started on this complaint", icon: "tool", color: "#7C3AED", bg: "#EDE9FE", show: complaint.status === "assigned" },
    { status: "resolved" as ComplaintStatus, label: "Resolved", note: "Complaint resolved by ward officer", icon: "check-circle", color: "#059669", bg: "#D1FAE5", show: complaint.status === "assigned" || complaint.status === "in_progress" },
  ];''',
)

server = Path("backend/server.js")
replace_once(
    server,
    '''    const [rows] = await db.query(
      "SELECT user_id, user_mobile, ward, ward_code FROM complaints WHERE id = ? LIMIT 1",
      [complaintId],
    );''',
    '''    const [rows] = await db.query(
      "SELECT user_id, user_mobile, ward, ward_code, status FROM complaints WHERE id = ? LIMIT 1",
      [complaintId],
    );''',
)
replace_once(
    server,
    '''    if (isSuperAdmin) return next();
    if (isOfficer) {
      const sameWard = user.ward_code
        ? String(complaint.ward_code || "").toLowerCase() === String(user.ward_code).toLowerCase()
        : String(complaint.ward || "").toLowerCase() === String(user.ward || "").toLowerCase();
      if (!sameWard) return res.status(403).json({ success: false, error: "Complaint belongs to another ward" });
      if (method === "PATCH") {
        const validStatuses = ["assigned", "in_progress", "resolved", "rejected"];
        if (!validStatuses.includes(String(req.body?.status || ""))) {
          return res.status(400).json({ success: false, error: "Invalid complaint status" });
        }
        req.body.updated_by = user.name;
      }
      return next();
    }''',
    '''    if (isOfficer) {
      const sameWard = user.ward_code
        ? String(complaint.ward_code || "").toLowerCase() === String(user.ward_code).toLowerCase()
        : String(complaint.ward || "").toLowerCase() === String(user.ward || "").toLowerCase();
      if (!sameWard) return res.status(403).json({ success: false, error: "Complaint belongs to another ward" });
    }

    if ((isSuperAdmin || isOfficer) && method === "PATCH") {
      const currentStatus = String(complaint.status || "submitted");
      const nextStatus = String(req.body?.status || "");
      const allowedTransitions = {
        submitted: ["assigned", "rejected"],
        assigned: ["in_progress", "resolved"],
        in_progress: ["resolved"],
        resolved: [],
        rejected: [],
      };
      if (!(allowedTransitions[currentStatus] || []).includes(nextStatus)) {
        return res.status(409).json({
          success: false,
          error: "This complaint action is not available for its current status",
        });
      }
      req.body.updated_by = user.name;
      if (nextStatus === "assigned" && !req.body.assigned_to) req.body.assigned_to = user.name;
    }

    if (isSuperAdmin || isOfficer) return next();''',
)

print("Complaint approval workflow applied.")
