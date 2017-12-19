var assert = require('chai').assert
var b2u = require("buckwalter-transliteration")("bw2utf");
var u2b = require("buckwalter-transliteration")("utf2bw");
// var fs = require("fs");

var av = null
before((done) => {
    "use strict";
    av = require('../main.js')({
        d: false,
        t: "test/txt/target.txt",
        corpus: "test/txt/source/",
        // filter: "^1",
        ngram: 5,
        callback: () => {
            console.log(u2b(av.getHashed(b2u("Amn~aA")).join("-")));
            console.log(u2b(av.getHashed(b2u("AmnaA")).join("-")));
            console.log(av.diacBasedAccuracy(b2u("Amn~aA"), b2u("AmnaA")));
            done()
        }
    })
    av.train()
})
describe('vowelization', () => {
    "use strict";
    it('should be the same. random sample 1', () => {
        check("hw", "huwa");
        check("Al*y", "Al~a*iy");
        check("ysyrkm", "yusay~irukumo");
        check("Alflk", "Alofulki");
        check("wjryn", "wajarayona");
        check("bhm", "bihim");
        check("bryH", "biriyHK");
        check("Tybp", "Tay~ibpK");
        check("kl", "kul~i");
        check("mkAn", "makaAonK");
        check("wZnwA", "waZan~uwA");
        check(">nhm", ">an~ahumo");
        check("mn", "min") // this is the first mn! be careful
        check("Al$Akryn", "Al$~aAokiriyna");
        check("bgyr", "bigayri");
        check("AlHq", "AloHaq~i");
        check("yA", "yaAo");
        check(">yhA", ">ayhaAo");
        check("AlnAs", "Aln~aAosu");
        check("tEmlwn", "taEomaluwna");
        check("fAxtlT", "faAoxotalaTa");
        check("nbAt", "nabaAotu");
        check("Al>rD", "Alo>aroDi") // note this is the first appearance
        check("mmA", "mim~aAo");
        check("HtY", "Hat~aY");
        check("<*A", "<i*aAo");
        check(">x*t", ">axa*ati");
        check("Al>rD", "Alo>aroDi") // repeated
        check("zxrfhA", "zuxorufahaAo");
        check("lqwm", "liqawomK");
        check("ytfkrwn", "yatafak~aruwna");
    })
    it('two possible values of diacritics', () => {
        //two values are possible. it depends on which file is read first
        assert.include(["bihi", "bahi"], u2b(av.original_target_words[av.h_no_diac.indexOf(b2u("bh"))]))
    })


    it('should have one non found', () => {
        assert.equal(av.results.not_found.length, 1)
    })

    // cannot guarantee this unless file read is sync
    // it('full text should match what checked version', ()=>{
    // 	var h = fs.readFileSync("test/target.diac.txt","utf-8");
    // 	assert.equal(av.getDiacritizedVersion(),h)
    // })

    // it('should have one non found', ()=>{check("",1)})

    function check(str, shouldbe) {
        assert.equal(u2b(av.original_target_words[av.h_no_diac.indexOf(b2u(str))]), shouldbe)
    }
})

describe('functions', () => {
            "use strict";
            it('diacBasedAccuracy', () => {
                // assert.equal().result,1) // 1
                assert.equal(av.diacBasedAccuracy(b2u("Amn~aA"), b2u("Amn~aA")).result, 1)
                assert.equal(av.diacBasedAccuracy(b2u("Amn~aA"), b2u("AmnaA")).result, 1)
                assert.equal(av.diacBasedAccuracy(b2u("AmnaA"), b2u("Amn~aA")).result, 0)
                assert.equal(av.diacBasedAccuracy(b2u("AminaA"), b2u("AmnaA")).result, 1)
                assert.equal(av.diacBasedAccuracy(b2u("AminaA"), b2u("AmniA")).result, 0)
                assert.equal(av.diacBasedAccuracy(b2u("AminaA"), b2u("AminiA")).result, 0.5)
            })
            it('getCompatiblePossibleTashkeels', () => {
                    // assert.equal().result,1) // 1
                    assert.equal(av.getCompatiblePossibleTashkeels(b2u("|bAkum"), ["|bAkum", ">abAkum", ">ab~Akum"].map(x => b2u(x))).length, 1)
                    assert.equal(av.getCompatiblePossibleTashkeels(b2u(">abAkum"), ["|bAkum", ">abAkum", ">ab~Akum"].map(x => b2u(x))).length, 2)
                    assert.equal(av.getCompatiblePossibleTashkeels(b2u(">abAk"), ["|bAka", "|bAki", ">abAka", ">abAki", ">ab~Aka", ">ab~Aki"].map(x => b2u(x))).length, 4);
                    // assert.equal(av.getCompatiblePossibleTashkeels(b2u("Amn~aA"), [">abAThmftqbD", "AbAThmftqbD", "AbAThmftqbDa", "AbAThmftqbDo"].map(x => b2u(x))).length, 1);
                    // assert.equal(av.getCompatiblePossibleTashkeels(b2u("Amn~aA"), ["|t"].map(x => b2u(x))).length, 1);
                    // assert.equal(av.getCompatiblePossibleTashkeels(b2u("Amn~aA"), ["|tAkum", ">atAkum"].map(x => b2u(x))).length, 1);
                    // assert.equal(av.getCompatiblePossibleTashkeels(b2u("Amn~aA"), ["|tAhu", ">atAha", ">atAhu", ">utAh"].map(x => b2u(x))).length, 1);
                    // assert.equal(av.getCompatiblePossibleTashkeels(b2u("Amn~aA"), ["|tAhA", ">atAhA"].map(x => b2u(x))).length, 1);
                    // assert.equal(av.getCompatiblePossibleTashkeels(b2u("Amn~aA"), ["|tAhum", ">atAhum"].map(x => b2u(x))).length, 1);
                    // assert.equal(av.getCompatiblePossibleTashkeels(b2u("Amn~aA"), ["|taY", "|tiy", "|tiy~a", ">ataY"].map(x => b2u(x))).length, 1);
                    // assert.equal(av.getCompatiblePossibleTashkeels(b2u("Amn~aA"), ["|tiyAni", "<itoyAn"].map(x => b2u(x))).length, 1);
                    // assert.equal(av.getCompatiblePossibleTashkeels(b2u("Amn~aA"), ["|tayotaniy", "|tayotiniy", ">atayotaniy", ">atayotiniy"].map(x => b2u(x))).length, 1);
                    })
            })