const expect = require('expect');
const {
    removeMedia,
    matchDomain
} = require('../src/util');

describe('axe-crawler/src/util.js', () => {
    describe('removeMedia', () => {
        it('should return false for urls in wp uploads', () => {
            let urlInputs = ['2l6jhkteyuploads/2017/04/kl2h56ilhe', 'lh546kbgreuploads/1999/12/79h7o382htisdfg', 'http://dummylink'];
            let booleanOutputs = [false, false, true];

            expect(urlInputs.map(removeMedia)).toEqual(booleanOutputs);
        });

        it('should return false for urls with media file extentions', () => {
            let urlInputs = ['9png824gh[.d;f.n205.pdf', '98v9345g][s;b.34.jpg', '8b9n0358nhgeh][wh\]456.doc', 'asg45getrh.exe', 'g4therth.avi', 'g4whthjuio780[.html', 'u0[0-9=9uio..json'];
            let booleanOutputs = [false, false, false, false, false, true, true];

            expect(urlInputs.map(removeMedia)).toEqual(booleanOutputs);
        });

        it('should return false for urls with "attachment_id" in them', () => {
            let urlInputs = ['asdfasdfattachment_idaefdasfsad', 'kskgfiusahdgiu'];
            let booleanOutputs = [false, true];

            expect(urlInputs.map(removeMedia)).toEqual(booleanOutputs);
        });
    });

    describe('matchDomain', () => {
        it('should return true for strings matching domain', () => {
            let domain = 'test.test';
            let filterFn = matchDomain(domain);

            let urlInputs = ['http://cnmipss.org/][p09fj408jfs0', 'http://google.com/978h24th9sd][;.',
                'http://test.test/asdong43'
            ];
            let booleanOutputs = [false, false, true];

            expect(urlInputs.map(filterFn)).toEqual(booleanOutputs);
        });

        it('should return true for relative links on the same domain', () => {
            let domain = 'test.test';
            let filterFn = matchDomain(domain);

            let urlInputs = ['/98hg39578hg98dfg', 'http://google.com/98h432t9ubn9sdg'];
            let booleanOutputs = [true, false];

            expect(urlInputs.map(filterFn)).toEqual(booleanOutputs);

        });
    });
});