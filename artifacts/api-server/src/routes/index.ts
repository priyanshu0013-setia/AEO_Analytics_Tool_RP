import { Router, type IRouter } from "express";
import healthRouter from "./health";
import campaignsRouter from "./campaigns.ts";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/campaigns", campaignsRouter);

export default router;
