import type { Evidence } from '@zofai/evidence-spec';
export type ReportFormat = 'junit'|'json'|'static-json';
export interface NormalizeOptions { format: ReportFormat; source?: Evidence['source']; metadata?: unknown; id?: string; createdAt?: string }
export interface ArtifactInput { path: string; format: ReportFormat }
export interface ArtifactOptions extends Omit<NormalizeOptions,'format'> { root: string; files: ArtifactInput[] }
export interface ParsedReport { tests: Evidence['tests']; findings: Evidence['findings']; status: Evidence['execution']['status']; result: Evidence['execution']['result']; warnings: string[] }
