const originalExit = process.exit;
process.exit = function(code) {
  console.log('process.exit called with code ' + code);
  console.log(new Error().stack);
  originalExit.call(process, code);
};
import('./dist/index.js').catch(err => {
  console.error("Import failed:", err);
});
