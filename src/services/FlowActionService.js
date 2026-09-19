/**
 * FlowActionService.js — Alias re-export for FlowDownloadService
 * 
 * Provides backwards compatibility and unified naming for card action
 * and download workflows.
 */

export {
  FlowDownloadService,
  FlowDownloadService as FlowActionService,
  flowDownloadService,
  flowDownloadService as flowActionService
} from './FlowDownloadService.js';
