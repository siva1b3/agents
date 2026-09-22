export function createStructuredLogger(output = console) {
  return {
    info(fields) { output.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', ...fields })); },
    error(fields) { output.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', ...fields })); },
  };
}
