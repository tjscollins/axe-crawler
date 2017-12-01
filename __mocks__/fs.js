const fs = jest.genMockFromModule('fs');

let alwaysReturn = '';

function readFileSync() {
  return alwaysReturn;
}

function __alwaysReturn(string) {
  alwaysReturn = string;
}

fs.readFileSync = readFileSync;
fs.__alwaysReturn = __alwaysReturn;

export default fs;

