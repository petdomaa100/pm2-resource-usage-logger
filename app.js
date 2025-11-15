const pm2 = require('pm2');
const pmx = require('pmx');
const fs = require('node:fs');
const path = require('node:path');

/** @type {Record<CsvColumn, (p: pm2.ProcessDescription) => string | number | undefined>} */
const COLUMN_GETTERS = {
	name: p => p.name,
	pid: p => p.pid,
	pm_id: p => p.pm_id,
	memory: p => p.monit?.memory,
	cpu: p => p.monit?.cpu,
	pm_uptime: p => p.pm2_env?.pm_uptime,
	status: p => p.pm2_env?.status,
	restart_time: p => p.pm2_env?.restart_time,
	unstable_restarts: p => p.pm2_env?.unstable_restarts,
	instances: p => p.pm2_env?.instances,
};

/**
 * @param {pm2.ProcessDescription[]} processes
 * @param {Config} config
 * @param {number} selfPmId
 * @returns {void}
 */
function logResourceUsage(processes, config, selfPmId) {
	const { excludeSelf, csvColumns, csvPath } = config;

	const now = Date.now();
	let csv = '';

	for (const p of processes) {
		if (excludeSelf && p.pm_id === selfPmId) {
			continue;
		}

		const values = csvColumns.map(col => COLUMN_GETTERS[col](p) || '');

		csv += now + ',' + values.join(',') + '\n';
	}

	if (csv.length === 0) {
		console.log('HERE'); // TODO: tmp, remove later
		return;
	}

	if (!fs.existsSync(csvPath)) {
		const header = 'timestamp,' + csvColumns.join(',') + '\n';

		fs.writeFileSync(csvPath, header);
	}

	fs.appendFileSync(csvPath, csv);
}

/**
 * @param {unknown} csv_columns
 * @returns {csv_columns is CsvColumn[]}
 */
function areSpecifiedCsvColumnsValid(csv_columns) {
	if (!Array.isArray(csv_columns) || csv_columns.length === 0) {
		console.error('Specified \'csv_columns\' is invalid, it must be a string array of length >= 1');
		return false;
	}

	for (const col of csv_columns) {
		if (!(col in COLUMN_GETTERS)) {
			console.error(`Column '${col}' is not a valid column, see the README for all the valid columns`);
			return false;
		}
	}

	return true;
}

pmx.initModule({}, (err, conf) => {
	if (err) {
		console.error('Error initializing module:\n', err);
		return;
	}

	const { module_conf } = conf;

	if (!areSpecifiedCsvColumnsValid(module_conf.csv_columns)) {
		return;
	}

	if (typeof module_conf.interval_ms !== 'number') {
		console.error('Specified \'interval_ms\' is invalid, it must be a number');
		return;
	}

	if (typeof module_conf.output_csv_path !== 'string') {
		console.error('Specified \'output_csv_path\' is invalid, it must be a string');
		return;
	}

	if (typeof module_conf.exclude_self !== 'boolean') {
		console.error('Specified \'exclude_self\' is invalid, it must be a boolean');
		return;
	}

	const selfPmId = Number(process.env.pm_id);

	if (isNaN(selfPmId)) {
		console.error('Failed to find own PM2 id, shouldn\'t happen');
		return;
	}

	// =====

	/** @type {Config} */
	const config = {
		excludeSelf: module_conf.exclude_self,
		csvColumns: module_conf.csv_columns,
		intervalMs: module_conf.interval_ms,
		csvPath: path.resolve(module_conf.output_csv_path),
	};

	console.log('Started PM2 Resource Usage Logger with config:');
	console.log(config);

	setInterval(() => {
		pm2.list((err, processes) => {
			if (err) {
				console.error('Error fetching processes:\n', err);
			} else {
				logResourceUsage(processes, config, selfPmId);
			}
		});
	}, config.intervalMs);
});
