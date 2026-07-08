import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import authRouter from "./auth";
import projectsRouter from "./projects";
import libraryRouter from "./library";
import ordersRouter from "./orders";
import stitchRouter from "./stitch";
import printFilesRouter from "./print-files";
import webhooksRouter from "./webhooks";
import draftCheckoutRouter from "./draft-checkout";
import upscaleRouter from "./upscale";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(authRouter);
router.use(projectsRouter);
router.use(libraryRouter);
router.use(ordersRouter);
router.use(stitchRouter);
router.use(printFilesRouter);
router.use(webhooksRouter);
router.use(draftCheckoutRouter);
router.use(upscaleRouter);

export default router;
