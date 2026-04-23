import { Router } from "express";

const router = Router();

router.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === "vedant@7connectT" &&
    password === "vedant7@node.js"
  ) {
    return res.json({
      success: true,
      message: "Admin login success",
    });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid credentials",
  });
});

export default router;
