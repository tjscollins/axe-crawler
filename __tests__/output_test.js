
import fs from 'fs';
import { outputToJSON, outputToHTML } from '../src/output';
import polyfills from '../src/polyfills';

jest.mock('fs');
polyfills();

beforeEach(() => {
  fs.writeFile.mockReset();
});

describe('outputToJSON', () => {
  it('should write formatted json reports to file', () => {
    const testObject = {
      test: 'test',
    };

    outputToJSON('json-file', testObject);

    expect(fs.writeFile.mock.calls.length).toBe(1);
    expect(fs.writeFile.mock.calls[0][0]).toBe('json-file');
    expect(fs.writeFile.mock.calls[0][1]).toBe(JSON.stringify(testObject, null, 2));
  });
});

describe('outputToHTML', () => {
  it('should output valid HTML to the supplied file name', (done) => {
    jest.unmock('fs');
    require('fs').readFile('./reports.json', 'utf8', (err, res) => {
      const reports = JSON.parse(res);
      jest.mock('fs');

      outputToHTML('html-output', reports);

      expect(fs.writeFile.mock.calls.length).toBe(1);
      expect(fs.writeFile.mock.calls[0][0]).toBe('html-output');
      expect(typeof fs.writeFile.mock.calls[0][1]).toBe('string');
      expect(isHTML(fs.writeFile.mock.calls[0][1])).toBe(true);
      done();
    });
  });
});

function isHTML(string) {
  return /<(br|basefont|hr|input|source|frame|param|area|meta|!--|col|link|option|base|img|wbr|!DOCTYPE).*?>|<(a|abbr|acronym|address|applet|article|aside|audio|b|bdi|bdo|big|blockquote|body|button|canvas|caption|center|cite|code|colgroup|command|datalist|dd|del|details|dfn|dialog|dir|div|dl|dt|em|embed|fieldset|figcaption|figure|font|footer|form|frameset|head|header|hgroup|h1|h2|h3|h4|h5|h6|html|i|iframe|ins|kbd|keygen|label|legend|li|map|mark|menu|meter|nav|noframes|noscript|object|ol|optgroup|output|p|pre|progress|q|rp|rt|ruby|s|samp|script|section|select|small|span|strike|strong|style|sub|summary|sup|table|tbody|td|textarea|tfoot|th|thead|time|title|tr|track|tt|u|ul|var|video).*?<\/\2>/i.test(string);
}
