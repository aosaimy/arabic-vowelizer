var fs = require('fs');
const path = require('path');
const chalk = require('chalk');
var normalizer = require('arabic-normalizer');

class Vowelizer{
	constructor(argv){
		this.default_config = {
			"ngram": 5,
			"filter": "",
			"corpus": __dirname + "test/txt/source/",
			"stats": false,
			"o": false,
			"t" : false,
			"d": false,
			"callback": false,
		}
		this.removeDiac_normalizer_config = {
			'diac':true,
		    'alif':false,
		    'tatweel':false,
		    'digits':false,
		    'punc':false,
		    's_digits':false,
		    // 'remove_punc': true
		}
		this.keepDiac_normalizer_config = {
			'diac':false,
		    'alif':false,
		    'tatweel':false,
		    'digits':false,
		    'punc':false,
		    's_digits':false,
		    // 'remove_punc': true
		}
		this.not_found = []
		this.completeWords = []
		this.counters = {
			tokens_inCompleteWords : 0,
			tokens_completeWords: 0,
			tokens_weThinkCompleteButNot: 0,
			tokens_notArabic: 0,
			lines: 1,
		}
		this.timer = {
			start: new Date()
		}
		this.current_letter =0
		this.config = {}
		this.index = {}
		this.arb_letter = /[\u0627-\u063A\u0641-\u064A]/
		console.log(argv);
		Object.keys(this.default_config).forEach(e=>this.config[e] = argv[e] || this.default_config[e])
	}
	


	train(){
		console.error(chalk.yellow("TIME=",this.timer.start))
		
		var h = ""
		if(this.config.t)
			h = fs.readFileSync(this.config.t,"utf-8")
		else if(this.config.text)
			h = this.config.text
		
		console.log(this.config);

		this.config.filter = new RegExp(this.config.filter)

		this.h_no_diac = normalizer(h,this.removeDiac_normalizer_config).trim().replace(/\n/g," ± ").split(/ /)
		this.original_target_words = normalizer(h,this.keepDiac_normalizer_config).trim().replace(/\n/g," ± ").split(/ /)
				
		console.error(chalk.yellow("NGRAM=",this.config.ngram))
		this._checkTwoWordListIfAligned(this.original_target_words,this.h_no_diac);
		this._indexingTargetCorpus()


		//// read Taskeela
		if(this.config.d) console.error(chalk.green("READING Source corpora. file by file."))
		var files = fs.readdirSync(this.config.corpus)

		if(this.config.d) console.error(chalk.green("INDEXING Source corpora."))
		this.pending = 0
		for(let file of files){
			if(!this.config.filter.test(file[0]) || file[0]=="."){
				continue
			}
			this.pending++
			this._readFile(file)
			// break
		}
	}
	_readFile(file){
		var that = this
		fs.readFile(path.join(this.config.corpus,file),{encoding:"utf-8"},(err,data)=>{
			if(err)
				console.error(err);
			that._processFile(data.trim(),file)
			this.pending--;
			if(this.pending === 0){
				console.error(chalk.magenta("ALL files are done."));
				that._emitAllDone()
			}
			else
				console.error(chalk.magenta(this.pending,"files to go"));
		})
	}

	diacritize(origin){
		var str = origin.trim().replace(/\n/g," ± ").split(/ /);
		str.forEach((v,i,arr)=>{
			var ngram = this.getNgram(arr,i)
			if(this.index[ngram])
				arr[i] = this.index[ngram].word
		})
		return str.join(" ").replace(" ± ","\n")
	}

	contradict(diacritics, new_diac){
		if(diacritics.indexOf(new_diac) >= 0 )
			return true
		if(/[\u064E-\u0650\u0652\u064B-\u064D]/.test(new_diac) && /[\u064E-\u0650\u0652\u064B-\u064D]/.test(diacritics.join("")))
			return true
		return false
	}
	getNgram(arr,myi){
		if(!Array.isArray(arr))
			if (typeof arr == "string")
				arr = arr.split()
			else{
				throw new Error("Input is not array nor string")
				return ""
			}
		var result = [arr[myi]]
		for(let i = myi+1; i<arr.length;i++){
			if(result.length >= this.config.ngram/2)
				break;
			if(this.isArabic(arr[i]))
				result.push(arr[i])
			else if(arr[i] == "±"){ // newline
				result.push("ß")
				i--
			}
		}
		while(result.length < this.config.ngram/2)
			result.push("ß")

		for(let i = myi-1; i>=0;i--){
			if(result.length >= this.config.ngram)
				break;
			if(this.isArabic(arr[i]))
				result.unshift(arr[i])
			else if(arr[i] == "±"){ // newline
				result.unshift("ß")
				i++
			}
		}
		while(result.length < this.config.ngram)
			result.unshift("ß")
		return result.join(" ")
	}

	_checkTwoWordListIfAligned(diaced_words,undiaced_words){
		if(diaced_words.length != undiaced_words.length){
			diaced_words.forEach((v,i)=>{
				if(normalizer(diaced_words[i],this.removeDiac_normalizer_config)!=undiaced_words[i]){
					console.error("Text after normalizing is not with same length",diaced_words.length," != ",undiaced_words.length)
					console.error("Error is at line=",i,":")
					console.error(diaced_words[i-2],"\t",undiaced_words[i-2])
					console.error(diaced_words[i-1],"\t",undiaced_words[i-1])
					console.error("###",diaced_words[i],"#\t#",undiaced_words[i])
					console.error(diaced_words[i+1],"\t",undiaced_words[i+1])
					console.error(diaced_words[i+2],"\t",undiaced_words[i+2])
					process.exit(0)
				}
			})
			console.error(chalk.red("Error was not found ! but the two lengths are different"))
			process.exit(0)
		}
		else
			if(this.config.d) console.error(chalk.green("Text after normalizing has the same length. PROCEED."))
	}

	_emitAllDone(){
		var that = this;
		Object.keys(this.index).filter(x=>this.index[x].alt.length > 1).forEach(x=>{
			let a = []
			that.current_letter =0
			that.index[x].word.split("").forEach((ch)=> that.toHash(ch,a,that.index[x].word))
			if(!that.index[x].book) that.index[x].book = [];
			
			that.index[x].alt.sort((aa,bb)=>bb.counter-aa.counter).forEach((alt)=>{
				let b = []
				that.current_letter =0
				alt.word.split("").forEach((ch)=> that.toHash(ch,b,alt))
				b.forEach((x,i)=>x.filter(xx=>!that.contradict(a[i],xx)).forEach(xx=>a[i].push(xx)))
			})
			that.index[x].word = a.map(x=>x.join("")).join("")
		})

		this.results = this._calculateResults(this.index)

		this.results.found.map((v)=>{
			v.loc.forEach(x=>{
				this.original_target_words[x] = v.word
			})
		})
		if(this.config.callback){
			this.config.callback.call(this);
		}
		if(this.config.d){
			this.results.h_no_diac = this.h_no_diac
			this.results.original_target_words = this.original_target_words
			this.results.new_not_found = this.not_found
		}
		
		if(this.config.stats)
			fs.writeFileSync(this.config.stats, JSON.stringify(this.results,null,4),{encoding:"utf-8"})
		if(this.config.o)
			fs.writeFileSync(this.config.o, this.getDiacritizedVersion(),{encoding:"utf-8"})
		if(this.config.stats){
			this.timer.end = new Date()
			console.error(chalk.yellow("ENDTIME=",this.timer.end))
			console.error(chalk.yellow("SECOND=",this.timer.end.getTime() / 1000 - this.timer.start.getTime() / 1000))
		}
	}
	getDiacritizedVersion(){
		return this.original_target_words.join(" ").replace(/ *± */g,"\n")
	}
	_indexingTargetCorpus(){
		if(this.config.d) console.error(chalk.green("INDEXING Target corpus."))
		var wordTypes = {}
		var range = [...Array(this.config.ngram+4).keys()].map(x=>x-parseInt((this.config.ngram+4)/2))
		this.h_no_diac.forEach((x,i,arr)=>{
			wordTypes[x] = 0
			if(x=="±")
				this.counters.lines++;
			if (!this.isArabic(this.original_target_words[i])){
				this.counters.tokens_notArabic++;
				return
			}
			var right_ngram = this.getNgram(arr,i)
			if (this.isComplete(this.original_target_words[i])){
				if(this.completeWords.length < 100)
					this.completeWords.push({
						word:this.original_target_words[i],
						ngram:right_ngram
					})
				this.counters.tokens_completeWords++;
				// return;
			}
			else
				this.counters.tokens_inCompleteWords++
			if(!this.index[right_ngram]){
				this.index[right_ngram] ={
					line: this.counters.lines,
					loc:[],
					// TWO OPTIONS HERE: 1. will be better, but no accuracy is calculated 2. vice versa
					// word: this.original_target_words[i],
					word: arr[i],
					normalized_word: arr[i], // this is used for validation
					ngram:right_ngram,
					alt: [], // if this ngram has alternative diacritization
					original_word: this.original_target_words[i] // this will not be changed
				}
				if(this.config.d){
					this.index[right_ngram].context = range.map((xx)=>arr[i+xx]).join(" ") // for validation
					this.index[right_ngram].diac =  this.getNgram(this.original_target_words,i) // for debugging
				}
			}
			if(this.index[right_ngram].alt.findIndex(x=>x.word==this.original_target_words[i]) == -1){
				this.index[right_ngram].alt.push({
					ngram: this.getNgram(this.original_target_words,i),
					undiac: this.index[right_ngram].normalized_word,
					word: this.original_target_words[i],
					counter: 1
				})
			}
			this.index[right_ngram].loc.push(i)
		})
		this.counters.tokens_allwords = this.original_target_words.length
		this.counters.tokens_arabic = this.original_target_words.length - this.counters.tokens_notArabic
		this.counters.word_types = Object.keys(wordTypes).length
		console.error(chalk.blue("STATS number of words that need tashkeel=",this.counters.tokens_inCompleteWords,"out of",this.counters.allWords))
		console.error(chalk.blue("STATS word types number=",this.counters.word_types))
		console.error(chalk.blue("STATS distinc ngram number=",Object.keys(this.index).length))
		return this.index
	}

	_calculateResults(){
		var frequency_list = Object.keys(this.index).map(key=>new Object({
			number: this.index[key].loc.length,
			word: key
		})).sort((a,b)=>b.number-a.number).slice(0,100)

		if(this.config.d) console.error(chalk.green("CHANGING Ngrams."))

		var not_found = Object.keys(this.index).filter(x=>!this.index[x].book).map(x=>this.index[x])
		var found = Object.keys(this.index).filter(x=>this.index[x].book).map(x=>this.index[x])
		var hasAlt = Object.keys(this.index).filter(x=>this.index[x].alt.length > 1).sort((a,b)=>-this.index[a].alt.length + this.index[b].alt.length).map(x=>this.index[x])
		// var hasAlt = Object.keys(this.index).filter(x=>this.index[x].alt.length > 1).sort((a,b)=>-this.index[a].alt.length + this.index[b].alt.length).map(x=>this.index[x].alt)
		// var random = parseInt(Math.random()*100)%found.length;
		this.counters.found_inComplete_occurances = found.filter(x=>!this.isComplete(x.word)).map(x=>x.loc.length).reduce(( acc, cur ) => acc + cur, 0)
		this.counters.found_inComplete_distinct = found.filter(x=>!this.isComplete(x.word)).length
		this.counters.found_occurances = found.map(x=>x.loc.length).reduce(( acc, cur ) => acc + cur, 0)
		this.counters.found_distinct = found.length
		console.error(chalk.blue("STATS diacritics found:",this.counters.found_distinct, "(distinc ngrams), with a total of appeareances=", this.counters.found_occurances))
		
		var counts = {}
		// var top_lines = not_found.forEach(x=>counts[x.line] = counts[x.line]+1||1)
		counts = Object.keys(counts).map(key=>new Object({
			number: counts[key],
			line: key
		})).sort((a,b)=>b.number-a.number).slice(0,30)
		// random = parseInt(Math.random()*100)%not_found.length;
		this.counters.not_found_occurances = not_found.map(x=>x.loc.length).reduce(( acc, cur ) => acc + cur, 0)
		this.counters.not_found_distinct = not_found.length
		this.counters.not_found_complete_occurances = not_found.filter(x=>this.isComplete(x.word)).map(x=>x.loc.length).reduce(( acc, cur ) => acc + cur, 0)
		this.counters.not_found_complete_distinct = not_found.filter(x=>this.isComplete(x.word)).length
		this.counters.tokens_weThinkCompleteButNot = Object.keys(this.index).filter(x=>this.index[x].weThinkCompleteButNot).length
		console.error(chalk.blue("STATS not found ngrams in Riyadh = ",not_found.length))
		if(this.config.d)
			found.forEach(v=>{
				if(v.normalized_word != normalizer(v.word,this.removeDiac_normalizer_config)){
					console.error(v)
					throw new Error()
				}
			})
		var percent = {
			initial_incomplete_percentage: (this.counters.tokens_inCompleteWords )/this.counters.tokens_arabic,
			initial_true_incomplete_percentage: (this.counters.tokens_inCompleteWords + this.counters.tokens_weThinkCompleteButNot )/this.counters.tokens_arabic,
			final_incomplete_percentage: (this.counters.found_inComplete_occurances + this.counters.not_found_occurances - this.counters.not_found_complete_occurances )/this.counters.tokens_arabic,
		}
		// var wordLevel = found.filter(x=>x.word==x.original_word).map(x=>x.loc.length)
		// var diacLevel = found.map(x=>this.diacBasedAccuracy(x.word,x.original_word)).map(x=>x.loc.length)

		return {
			found: found,
			not_found: not_found,
			frequency_list: frequency_list,
			not_found_per_line: counts,
			completeWords_sample: this.completeWords,
			counters: Object.keys(this.counters).sort().reduce((r, k) => (r[k] = this.counters[k], r), {}), // to sort keys alphanumerically
			percent: percent,
			hasAlt: hasAlt,
		}
	}

	_processFile(file_text,book){
		if(this.config.d) console.error(chalk.green("READING file=", book))
		if(this.config.d) console.error(chalk.green("NORMALIZING it."))
		var words = normalizer(file_text,this.keepDiac_normalizer_config).replace(/\n/g," ± ").split(/ /)
		var words_normalized = normalizer(file_text,this.removeDiac_normalizer_config).replace(/\n/g," ± ").split(/ /)

		this._checkTwoWordListIfAligned(words,words_normalized)

		// var current_line = 0
		if(this.config.d) console.error(chalk.green("INDEXING it."))
		words.forEach((w,i,arr)=>{
			//has no taskeel!
			var right_ngram = this.getNgram(words_normalized,i)
			if(!/[\u064B-\u0652]/.test(w)){
				return
			}

			// NEW
			if(!this.index[right_ngram]){// || this.index[w].length>1000)
				return
			}
			if(typeof this.index[right_ngram].word !== "string")
				console.error(this.index[right_ngram])
			if(this.index[right_ngram].alt.findIndex(x=>x.word==w) == -1){
				this.index[right_ngram].alt.push({
					ngram: this.getNgram(arr,i),
					undiac: this.index[right_ngram].normalized_word,
					word: w,
					book: book,
					counter: 1
				})
			}
			else
				this.index[right_ngram].alt.find(x=>x.word==w).counter++
		})
	}
	toHash (ch,arr,word){
		if(ch.charCodeAt(0) >= 1611 && ch.charCodeAt(0) <= 1618){
			if(!arr[this.current_letter] && this.config.d){
				if(this.config.d) console.error(chalk.green("WARNING word start with diac!"),word)
				return
			}
			// if(!Array.isArray(arr[this.current_letter]))
			// console.log(arr[this.current_letter],arr)
			arr[this.current_letter].push(ch)
		}
		else{
			arr.push([ch])
			this.current_letter = arr.length-1
		}
	}
	isArabic(word){
		return this.arb_letter.test(word)
	}
	isComplete(word){
		var arr = []
		this.current_letter =0
		word.split("").forEach((ch)=> this.toHash(ch,arr,word))
		var full_word = arr.map(x=>x[0]).join("")
		if(/ا?لله/.test(full_word))
			return true
		for(var i in arr){
			if(arr[i].length <= 1){ // has no tashkeel

				// okay if next letter is madd
				i = parseInt(i)
				var nextLetter = i < arr.length-1 ? arr[i+1][0] : '';
				var prevLetter = i > 0 ? arr[i-1][0] : '';
				if ( nextLetter == '\u0627' || nextLetter == '\u0648' || nextLetter == '\u064A' )
					continue
				// .. or is a madd
				if ( arr[i] == '\u0627' || arr[i] == '\u0648' || arr[i] == '\u064A'|| arr[i] == '\u0649' )
					// but it cannot be at begining except alif
					if(i>0 || arr[i] == '\u0627')
						continue

				// .. or is a madd
				if ( arr[i] == 'إ')
					continue

				// if it is det al (AL altareef)
				if (prevLetter[0]=="ا" && arr[i][0]=="ل")
					continue
				return false
			}
		}
		return true
	}

	mergeTwoWords(best_replace, target_word){
		
		let a = [], b = []
		this.current_letter =0
		target_word.split("").forEach((ch)=> this.toHash(ch,a,target_word))
		this.current_letter =0
		best_replace.split("").forEach((ch)=> this.toHash(ch,b,best_replace))
		if(a.length!=b.length)
			console.error(chalk.red("ERROR: merge two unequal string",a,b))
		return a.map((x,i)=>a[i].length > b[i].length ? a[i].join("") : b[i].join("") ).join("")
	}
	diacBasedAccuracy(candidate, best){
		let a = [], b = []
		this.current_letter =0
		best.split("").forEach((ch)=> this.toHash(ch,a,best))
		this.current_letter =0
		candidate.split("").forEach((ch)=> this.toHash(ch,b,candidate))
		if(a.length!=b.length)
			console.error(chalk.red("ERROR: merge two unequal string",a,b))
		return a.map((x,i)=>a[i].length > b[i].length ? 1 : a[i].length == b[i].length ? 0 : -1 ).join("")
	}
}

if (require.main === module) { // called directly
	var argv = require('yargs')
	    .usage('Usage: $0 [-m all|exceptPos] [-st] [-e example_filename] -f filename')
	    .default('t',"/dev/stdin").describe('t','Target corpus')
	    .default('ngram',5).describe('ngram','Ngram to be used')
	    .default('filter','.*').describe('filter','filter regexp for files in corpus folder')
	    .demand('corpus').describe('corpus','The corpus to retrieve diacritized from.')
	    .describe('stats','filename to write JSON of useful statistical information.')
	    .describe('o','filename for diacritized text output.')
	    .boolean("d").describe("d", "debug")
	    .argv
	var av = new Vowelizer(argv);
	av.train()
}
else{
	module.exports = (argv)=>{return new Vowelizer(argv)}
}
