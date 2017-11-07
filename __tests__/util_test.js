/* global describe it expect */
import { filterLinks, selectSampleSet, isDoc, notMedia, matchDomain } from '../src/util';
import polyfills from '../src/polyfills';

polyfills();

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

  describe('selectSampleSet', () => {
    it('should return a function to be passed to Array.prototype.reduce', () => {
      const reducerFn = selectSampleSet({ random: false });

      expect(reducerFn).toBeInstanceOf(Function);
      expect(reducerFn.length).toBe(2);
    });

    describe('returned reducer Fn', () => {
      it('should select all elements if opts.random is false', () => {
        const reducerFn = selectSampleSet({ random: false });
        const list = [...new Array(100)].map(() => Math.random()).reduce(reducerFn, []);

        expect(list.length).toBe(100);
      });

      it('should randomly select elements from an array', () => {
        /* Test for random selection rates from .05 to .95 */
        for (let i = 0.05; i < 1.0; i += 0.05) {
          const p = i;
          const N = 10000;
          const stdDev = Math.sqrt(p * N * (1 - p));

          const reducerFn = selectSampleSet({ random: p });
          const list = [...new Array(N)].map(() => Math.random());
          const reducedList = list.reduce(reducerFn, []);

          /* Expect randomly sampled list to be within 3.5 Std Dev of
           * expected mean size for a given p value (99.95% probability)
           * which means 1 in 2000 tests will fail by chance.
           */
          expect(reducedList.length).toBeLessThan((p * list.length) + (3.5 * stdDev));
          // Expect every item in random sample to be from the original
          reducedList.forEach((n) => {
            expect(list.indexOf(n)).toBeGreaterThanOrEqual(0);
          });
        }
      });
    });
  });

  describe('filterLinks', () => {
    it('should return a function to be passed to Array.prototype.filter', () => {
      const filterFn = filterLinks({});

      expect(filterFn).toBeInstanceOf(Function);
      expect(filterFn.length).toBe(1);
    });

    describe('returned Fn', () => {
      const URLS = [
        'https://www.example.net/#believe',
        'http://www.example.com/appliance/addition.php',
        'https://breath.example.com/breath/alarm.aspx#bit',
        'http://www.example.com/blade/balance',
        'http://www.example.com/air/airplane.php?beginner=bomb',
        'https://www.example.com/apparatus/alarm.aspx#advice',
        'https://www.example.com/bomb.aspx#basin',
        'https://www.example.com/?baseball=bag',
        'http://base.example.com/',
        'http://bit.example.net/bridge.html?ants=bikes&amount=bells#arm',
      ];
      it('should return true for valid URLs', () => {
        const results = URLS.map(filterLinks({
          domain: 'example',
        }));

        expect(results).toEqual([true, true, true, true, true, true, true, true, true, true]);
      });

      it('should return false for urls matching opts.ignore', () => {
        const results = URLS.map(filterLinks({
          domain: 'example',
          ignore: 'www',
        }));

        expect(results).toEqual([false, false, true, false, false, false, false, false, true, true]);
      });

      it('should return true for urls matching opts.whitelist', () => {
        const results = URLS.map(filterLinks({
          domain: 'example',
          whitelist: 'net',
        }));

        expect(results).toEqual([true, false, false, false, false, false, false, false, false, true]);
      });
    });
  });
});
