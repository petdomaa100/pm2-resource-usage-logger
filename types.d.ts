declare module 'pmx' {
	interface PMXConfig {
		module_conf: Record<string, unknown>;
	}

	export function initModule(
		config: Record<string, any>,
		callback: (err: unknown, conf: PMXConfig) => void,
	): void;
}

// =====

type CsvColumn =
	| 'name'
	| 'pid'
	| 'pm_id'
	| 'memory'
	| 'cpu'
	| 'pm_uptime'
	| 'status'
	| 'restart_time'
	| 'unstable_restarts'
	| 'instances';

interface Config {
	excludeSelf: boolean;
	csvColumns: CsvColumn[];
	csvPath: string;
	intervalMs: number;
}
