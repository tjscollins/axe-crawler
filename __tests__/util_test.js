/* global describe it expect */
import { isDoc, notMedia, matchDomain } from '../src/util';

describe('axe-crawler/src/util.js', () => {
  describe('removeMedia', () => {
    it('should return false for urls in wp uploads', () => {
      const urlInputs = ['2l6jhkteyuploads/2017/04/kl2h56ilhe', 'lh546kbgreuploads/1999/12/79h7o382htisdfg', 'http://dummylink'];
      const booleanOutputs = [false, false, true];

      expect(urlInputs.map(notMedia)).toEqual(booleanOutputs);
    });

    it('should return false for urls with media file extentions', () => {
      const urlInputs = ['9png824gh[.d;f.n205.pdf', '98v9345g][s;b.34.jpg', '8b9n0358nhgeh][wh\]456.doc', 'asg45getrh.exe', 'g4therth.avi', 'g4whthjuio780[.html', 'u0[0-9=9uio..json'];
      const booleanOutputs = [false, false, false, false, false, true, true];

      expect(urlInputs.map(notMedia)).toEqual(booleanOutputs);
    });

    it('should return false for urls with "attachment_id" in them', () => {
      const urlInputs = ['asdfasdfattachment_idaefdasfsad', 'kskgfiusahdgiu'];
      const booleanOutputs = [false, true];

      expect(urlInputs.map(notMedia)).toEqual(booleanOutputs);
    });
  });

  describe('matchDomain', () => {
    it('should return true for strings matching domain', () => {
      const domain = 'test.test';
      const filterFn = matchDomain(domain);

      const urlInputs = ['http://cnmipss.org/][p09fj408jfs0', 'http://google.com/978h24th9sd][;.',
        'http://test.test/asdong43',
      ];
      const booleanOutputs = [false, false, true];

      expect(urlInputs.map(filterFn)).toEqual(booleanOutputs);
    });

    it('should return true for relative links on the same domain', () => {
      const domain = 'test.test';
      const filterFn = matchDomain(domain);

      const urlInputs = ['/98hg39578hg98dfg', 'http://google.com/98h432t9ubn9sdg'];
      const booleanOutputs = [true, false];

      expect(urlInputs.map(filterFn)).toEqual(booleanOutputs);
    });
  });

  describe('isDoc', () => {
    it('should return true for strings matching document extensions', () => {
      const urlInputs = ['asdewrwuploads/2017/04/ertsadfqwe.docx', '234retguploads/2017/04/s98y2ihew.pptx', '2l6jhkteyuploads/2017/04/kl2h56ilhe', '235uploads/2017/04/wasrsdf.xls', 'lh546kbgreuploads/1999/12/79h7o382htiss', 'http://dummylink/uploads/2017/04/sadfdsf.pdf'];
      const booleanOutputs = [true, true, false, true, false, true];

      expect(urlInputs.map(isDoc)).toEqual(booleanOutputs);
    });
  });
});
