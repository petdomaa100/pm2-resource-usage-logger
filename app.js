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
 * @returns {CsvColumn[] | null}
 */
function parseCsvColumns(csv_columns) {
	if (typeof csv_columns !== 'string') {
		console.error('Specified \'csv_columns\' is invalid, it must be a string of comma separated values');
		return null;
	}

	/** @type {CsvColumn[]} */
	const parsed = [];

	for (const col of csv_columns.split(',')) {
		const trimmed = col.trim();

		if (trimmed in COLUMN_GETTERS) {
			parsed.push(/** @type {CsvColumn} */ (trimmed));
		} else {
			console.error(`Column '${col}' is not a valid column, see the README for all the valid columns`);
			return null;
		}
	}

	return parsed;
}

pmx.initModule({}, (err, conf) => {
	if (err) {
		console.error('Error initializing module:\n', err);
		return;
	}

	const { module_conf } = conf;
	const csvColumns = parseCsvColumns(module_conf.csv_columns);

	if (!csvColumns) {
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
		intervalMs: module_conf.interval_ms,
		csvPath: path.resolve(module_conf.output_csv_path),
		csvColumns,
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
