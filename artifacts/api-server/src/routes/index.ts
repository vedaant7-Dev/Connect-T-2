import { Router, type IRouter } from "express";
import healthRoute from "./health";
import adminRoute from "./admin";

const router: IRouter = Router();

router.use(healthRoute);
router.use(adminRoute);

export default router;
