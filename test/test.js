var assert = require('chai').assert
var b2u = require("buckwalter-transliteration")("bw2utf");
var u2b = require("buckwalter-transliteration")("utf2bw");
var fs = require("fs");

var av = null
describe('vowelization', ()=>{
	"use strict";
	before((done)=>{
		av = require('../main.js')({
			d: false,
			t : "test/txt/target.txt",
			corpus: "test/txt/source/",
			// filter: "^1",
			ngram: 5,
			callback: when_done_training
		})
		av.train()
		function when_done_training(){
			done()
		}
	})
	it('should be the same. random sample 1', ()=>{check("hw","huwa")})
	it('should be the same. random sample 1', ()=>{check("Al*y","Al~a*iy")})
	it('should be the same. random sample 1', ()=>{check("ysyrkm","yusay~irukumo")})
	it('should be the same. random sample 1', ()=>{check("Alflk","Alofulki")})
	it('should be the same. random sample 1', ()=>{check("wjryn","wajarayona")})
	it('should be the same. random sample 1', ()=>{check("bhm","bihim")})
	it('should be the same. random sample 1', ()=>{check("bryH","biriyHK")})
	it('should be the same. random sample 1', ()=>{check("Tybp","Tay~ibpK")})
	it('should be the same. random sample 1', ()=>{check("kl","kul~i")})
	it('should be the same. random sample 1', ()=>{check("mkAn","makaAonK")})
	it('should be the same. random sample 1', ()=>{check("wZnwA","waZan~uwA")})
	it('should be the same. random sample 1', ()=>{check(">nhm",">an~ahumo")})
	it('should be the same. random sample 1', ()=>{check("mn","min")}) // this is the first mn! be careful
	it('should be the same. random sample 1', ()=>{check("Al$Akryn","Al$~aAokiriyna")})
	it('should be the same. random sample 1', ()=>{check("bgyr","bigayri")})
	it('should be the same. random sample 1', ()=>{check("AlHq","AloHaq~i")})
	it('should be the same. random sample 1', ()=>{check("yA","yaAo")})
	it('should be the same. random sample 1', ()=>{check(">yhA",">ayhaAo")})
	it('should be the same. random sample 1', ()=>{check("AlnAs","Aln~aAosu")})
	it('should be the same. random sample 1', ()=>{check("tEmlwn","taEomaluwna")})
	it('should be the same. random sample 1', ()=>{check("fAxtlT","faAoxotalaTa")})
	it('two possible values of diacritics', ()=>{
		//two values are possible. it depends on which file is read first
		assert.include(["bihi","bahi"],u2b(av.original_target_words[av.h_no_diac.indexOf(b2u("bh"))]))
	})
	it('should be the same. random sample 1', ()=>{check("nbAt","nabaAotu")})
	it('should be the same. random sample 1', ()=>{check("Al>rD","Alo>aroDi")}) // note this is the first appearenac
	it('should be the same. random sample 1', ()=>{check("mmA","mim~aAo")})
	it('should be the same. random sample 1', ()=>{check("HtY","Hat~aY")})
	it('should be the same. random sample 1', ()=>{check("<*A","<i*aAo")})
	it('should be the same. random sample 1', ()=>{check(">x*t",">axa*ati")})
	it('should be the same. random sample 1', ()=>{check("Al>rD","Alo>aroDi")}) // repeated!
	it('should be the same. random sample 1', ()=>{check("zxrfhA","zuxorufahaAo")})
	it('should be the same. random sample 1', ()=>{check("lqwm","liqawomK")})
	it('should be the same. random sample 1', ()=>{check("ytfkrwn","yatafak~aruwna")})

	it('should have one non found', ()=>{assert.equal(av.results.not_found.length,1)})
	
	it('full text should match what checked version', ()=>{
		var h = fs.readFileSync("test/target.diac.txt","utf-8");
		assert.equal(av.getDiacritizedVersion(),h)
	})

	// it('should have one non found', ()=>{check("",1)})

	function check(str, shouldbe){
		assert.equal(u2b(av.original_target_words[av.h_no_diac.indexOf(b2u(str))]),shouldbe)
	}
})