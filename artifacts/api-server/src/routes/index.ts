import { Router, type IRouter } from "express";
import healthRouter from "./health";
import campaignsRouter from "./campaigns.ts";
import queriesRouter from "./queries.ts";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/campaigns", campaignsRouter);
router.use("/queries", queriesRouter);

export default router;
