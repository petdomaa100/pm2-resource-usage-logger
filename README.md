# PM2 Resource Usage Logger

A PM2 module that logs the resource usage of running processes to a CSV file.

## Installation

This is currently not published as an NPM packange. To install it, clone the repository, and run `pm2 install .` in the root directory.

## Configuration

- `interval_ms` (number, required): The interval in milliseconds between resource usage logs. \
(Defaults to `5000`)

- `output_csv_path` (string, required): Absolute or relative path to the output CSV file. \
(Defaults to `./pm2-resource-usage-logs.csv`)

- `csv_columns` (string[], required): Array of column names to include in the CSV. \
(Defaults to all the available columns)

- `exclude_self` (boolean, optional): Whether to exclude the module itself from the logs. \
(Defaults to `false`)

### Available Columns

The following columns can be specified in the `csv_columns` configuration option. Each maps to a specific property from PM2's process information:

| Column              | Description                                                      |
|---------------------|------------------------------------------------------------------|
| `name`              | The name of the process given in the original start command.     |
| `pid`               | The system process ID (PID) of the running process.              |
| `pm_id`             | The PM2 internal process ID used to identify the process in PM2. |
| `memory`            | The number of bytes the process is currently using in memory.    |
| `cpu`               | The percentage of CPU being used by the process.                 |
| `pm_uptime`         | The uptime of the process in milliseconds since it was started.  |
| `status`            | The current status of the process.                               |
| `restart_time`      | The number of times the process has been restarted.              |
| `unstable_restarts` | The number of unstable restarts the process has been through.    |
| `instances`         | The number of running instances for the process.                 |

### Example Configuration

```bash
pm2 set pm2-resource-usage-logger:csv_columns "name,pid,pm_id,memory,cpu,pm_uptime,status,restart_time,unstable_restarts,instances"

pm2 set pm2-resource-usage-logger:interval_ms 5000

pm2 set pm2-resource-usage-logger:output_csv_path ./out.csv
```

Further reading: https://pm2.keymetrics.io/docs/advanced/pm2-module-system

## CSV Output

Each row in the CSV file begins with the `timestamp` column containing the Unix timestamp of when the measurement was recorded. After that, the columns follow the order specified in `csv_columns`.
