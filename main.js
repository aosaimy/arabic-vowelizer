var fs = require('fs');
const path = require('path');
const chalk = require('chalk');
var normalizer = require('arabic-normalizer');

class Vowelizer {
    constructor(argv) {
        this.default_config = {
            "ngram": 5,
            "filter": "",
            "corpus": __dirname + "test/txt/source/",
            "stats": false,
            "o": false,
            "t": false,
            "d": false,
            "callback": false,
            "serialize": false,
            "deserialize": false,
            "dict": false
        }
        this.removeDiac_normalizer_config = {
            'diac': true,
            'alif': false,
            'tatweel': false,
            'digits': false,
            'punc': false,
            's_digits': false,
            // 'remove_punc': true
        }
        this.keepDiac_normalizer_config = {
            'diac': false,
            'alif': false,
            'tatweel': false,
            'digits': false,
            'punc': false,
            's_digits': false,
            // 'remove_punc': true
        }
        this.not_found = []
        this.completeWords = []
        this.counters = {
            tokens_inCompleteWords: 0,
            tokens_completeWords: 0,
            tokens_weThinkCompleteButNot: 0,
            tokens_notArabic: 0,
            lines: 1,
        }
        // this.counters.correct_diac_letters = 0
        // this.counters.number_of_diac_letters = 0
        // this.counters.new_number_of_diac_letters = 0
        // this.counters.all_letters = 0
        this.timer = {
            start: new Date()
        }
        // this.current_letter = 0
        this.config = {}
        this.index = {}
        this.arb_letter = /[\u0627-\u063A\u0641-\u064A]/
        Object.keys(this.default_config).forEach(e => this.config[e] = argv[e] || this.default_config[e])
        this.config.filter = new RegExp(this.config.filter)
        if (this.config.dict)
            try {
                if (!fs.existsSync(this.config.dict))
                    throw new Error("WARNING: no dict found: " + this.config.dict)
                this.dict = JSON.parse(fs.readFileSync(this.config.dict, {
                    encoding: "utf-8"
                }))
            } catch (e) {
                console.error(e.message)
                process.exit(1)
            }
        if (this.config.d) console.error(this.config);
    }


    serialize() {
        fs.writeFileSync(this.config_stringify(), JSON.stringify(this.index, null, 4), {
            encoding: "utf-8"
        })
    }
    deserialize() {
        try{
            this.readSourceFile()
            if (!fs.existsSync(this.config_stringify()))
                throw new Error("WARNING: no model found: " + this.config_stringify())
            this.index = JSON.parse(fs.readFileSync(this.config_stringify(), {
                encoding: "utf-8"
            }))
            // console.log(this.index);
            this.config.serialize = false;
            return true
        } catch (e) {
            console.error(e.message);
            return false
        }
    }
    config_stringify() {
        return [this.config.t, "filter" + this.config.filter.toString().replace(/[\[\]\/\^\$\-]/g, "±"), this.config.corpus.replace(/\//g, "%"), this.config.ngram].join("-") + ".json"
    }
    readSourceFile() {
        var h = ""
        if (this.config.t)
            h = fs.readFileSync(this.config.t, "utf-8")
        else if (this.config.text)
            h = this.config.text
        this.h_no_diac = normalizer(h, this.removeDiac_normalizer_config).trim().replace(/\n/g, " ± ").split(/ /)
        this.original_target_words = normalizer(h, this.keepDiac_normalizer_config).trim().replace(/\n/g, " ± ").split(/ /)
        var wordTypes = {}
        this.h_no_diac.forEach((x, i, arr) => {
            wordTypes[x] = wordTypes[x] || 1
            if (x == "±")
                this.counters.lines++;
            if (!this.isArabic(this.original_target_words[i])) {
                this.counters.tokens_notArabic++;
                return
            }
            var right_ngram = this.getNgram(arr, i)
            if (this.isComplete(this.original_target_words[i])) {
                if (this.completeWords.length < 100)
                    this.completeWords.push({
                        word: this.original_target_words[i],
                        ngram: right_ngram
                    })
                this.counters.tokens_completeWords++;
            } else
                this.counters.tokens_inCompleteWords++
        })

        this.counters.tokens_allwords = this.original_target_words.length
        this.counters.tokens_arabic = this.original_target_words.length - this.counters.tokens_notArabic
        this.counters.word_types = Object.keys(wordTypes).length
        if (this.config.d) console.error(chalk.blue("STATS number of words that need tashkeel=", this.counters.tokens_inCompleteWords, "out of", this.counters.allWords))
        if (this.config.d) console.error(chalk.blue("STATS word types number=", this.counters.word_types))
        if (this.config.d) console.error(chalk.blue("STATS distinc ngram number=", Object.keys(this.index).length))

    }
    train() {
        if (this.config.deserialize)
            if (this.deserialize()){
                this._mergeAlternatives()
                this._emitAllDone()
                return true
            }
        if (this.config.d) console.error(chalk.yellow("TIME=", this.timer.start))
        this.readSourceFile()

        if (this.config.d) console.error(chalk.yellow("NGRAM=", this.config.ngram))
        this._checkTwoWordListIfAligned(this.original_target_words, this.h_no_diac);
        this._indexingTargetCorpus()


        //// read Taskeela
        if (this.config.d) console.error(chalk.green("READING Source corpora. file by file."))
        var files = fs.readdirSync(this.config.corpus)

        if (this.config.d) console.error(chalk.green("INDEXING Source corpora."))
        this.pending = 0
        for (let file of files) {
            if (!this.config.filter.test(file[0]) || file[0] == ".") {
                continue
            }
            this.pending++
                this._readFile(file)
            // break
        }
    }
    _readFile(file) {
        var that = this
        fs.readFile(path.join(this.config.corpus, file), {
            encoding: "utf-8"
        }, (err, data) => {
            if (err)
                throw new Error(err);
            that._processFile(data.trim(), file)
            this.pending--;
            if (this.pending === 0) {
                // process.stderr.write(chalk.magenta("\rALL files are done.               \n"));
                that._mergeAlternatives()
                that._emitAllDone()
            } else
                process.stderr.write(chalk.magenta(`\r ${this.pending} files to go`));
        })
    }

    diacritize(origin) {
        var str = origin.trim().replace(/\n/g, " ± ").split(/ /);
        str.forEach((v, i, arr) => {
            var ngram = this.getNgram(arr, i)
            if (this.index[ngram])
                arr[i] = this.index[ngram].word
        })
        return str.join(" ").replace(/ *± */g, "\n")
    }

    contradict(diacritics, new_diac) {
        if (diacritics.indexOf(new_diac) >= 0)
            return true
        if (/[\u064E-\u0650\u0652\u064B-\u064D]/.test(new_diac) && /[\u064E-\u0650\u0652\u064B-\u064D]/.test(diacritics.join("")))
            return true
        return false
    }
    getNgram(arr, myi) {
        if (!Array.isArray(arr))
            if (typeof arr == "string")
                arr = arr.split()
        else {
            throw new Error("Input is not array nor string")
            return ""
        }
        var result = [arr[myi]]
        for (let i = myi + 1; i < arr.length; i++) {
            if (result.length >= this.config.ngram / 2)
                break;
            if (this.isArabic(arr[i]))
                result.push(arr[i])
            else if (arr[i] == "±") { // newline
                result.push("ß")
                i--
            }
        }
        while (result.length < this.config.ngram / 2)
            result.push("ß")

        for (let i = myi - 1; i >= 0; i--) {
            if (result.length >= this.config.ngram)
                break;
            if (this.isArabic(arr[i]))
                result.unshift(arr[i])
            else if (arr[i] == "±") { // newline
                result.unshift("ß")
                i++
            }
        }
        while (result.length < this.config.ngram)
            result.unshift("ß")
        return result.join(" ")
    }

    _checkTwoWordListIfAligned(diaced_words, undiaced_words) {
        if (diaced_words.length != undiaced_words.length) {
            diaced_words.forEach((v, i) => {
                if (normalizer(diaced_words[i], this.removeDiac_normalizer_config) != undiaced_words[i]) {
                    console.error("Text after normalizing is not with same length", diaced_words.length, " != ", undiaced_words.length)
                    console.error("Error is at line=", i, ":")
                    console.error(diaced_words[i - 2], "\t", undiaced_words[i - 2])
                    console.error(diaced_words[i - 1], "\t", undiaced_words[i - 1])
                    console.error("###", diaced_words[i], "#\t#", undiaced_words[i])
                    console.error(diaced_words[i + 1], "\t", undiaced_words[i + 1])
                    console.error(diaced_words[i + 2], "\t", undiaced_words[i + 2])
                    process.exit(0)
                }
            })
            console.error(chalk.red("Error was not found ! but the two lengths are different"))
            process.exit(0)
        } else
        if (this.config.d) console.error(chalk.green("Text after normalizing has the same length. PROCEED."))
    }

    _mergeAlternatives() {
        var that = this;
        Object.keys(this.index).filter(x => this.index[x].alt.length > 1).forEach(x => {
            let a = this.getHashed(that.index[x].word)
            if (!that.index[x].book) that.index[x].book = [];

            that.index[x].alt.sort((aa, bb) => bb.counter - aa.counter).forEach((alt) => {
                let b = this.getHashed(alt.word)
                b.forEach((x, i) => x.filter(xx => !that.contradict(a[i], xx)).forEach(xx => a[i].push(xx)))
            })
            that.index[x].word = a.map(x => x.join("")).join("")
        })
    }
    _emitAllDone() {

        if (this.config.serialize)
            this.serialize()

        this.results = this._calculateResults(this.index)

        Object.keys(this.index).map((i) => {
            var v = this.index[i]
            v.loc.forEach(x => {
                this.original_target_words[x] = v.word
            })
        })
        if (this.config.callback) {
            this.config.callback.call(this);
        }
        if (this.config.d) {
            this.results.h_no_diac = this.h_no_diac
            this.results.original_target_words = this.original_target_words
        }

        if (this.config.stats)
            fs.writeFileSync(this.config.stats, JSON.stringify(this.results, null, 4), {
                encoding: "utf-8"
            })
        if (this.config.o)
            fs.writeFileSync(this.config.o, this.getDiacritizedVersion(), {
                encoding: "utf-8"
            })
        if (this.config.stats) {
            this.timer.end = new Date()
            if (this.config.d) console.error(chalk.yellow("ENDTIME=", this.timer.end))
            if (this.config.d) console.error(chalk.yellow("SECOND=", this.timer.end.getTime() / 1000 - this.timer.start.getTime() / 1000))
        }
    }
    getDiacritizedVersion() {
        return this.original_target_words.join(" ").replace(/ *± */g, "\n")
    }
    _indexingTargetCorpus() {
        if (this.config.d) console.error(chalk.green("INDEXING Target corpus."))
        var range = [...Array(this.config.ngram + 4).keys()].map(x => x - parseInt((this.config.ngram + 4) / 2))
        this.h_no_diac.forEach((x, i, arr) => {
            if (x == "±")
                this.counters.lines++;
            if (!this.isArabic(this.original_target_words[i])) {
                return
            }
            var right_ngram = this.getNgram(arr, i)
            if (!this.index[right_ngram]) {
                this.index[right_ngram] = {
                    line: this.counters.lines,
                    loc: [],
                    // TWO OPTIONS HERE: 1. will be better, but no accuracy is calculated 2. vice versa
                    // word: this.original_target_words[i],
                    word: arr[i],
                    normalized_word: arr[i], // this is used for validation
                    ngram: right_ngram,
                    alt: [], // if this ngram has alternative diacritization
                    original_word: this.original_target_words[i] // this will not be changed
                }
                if (this.config.d) {
                    this.index[right_ngram].context = range.map((xx) => arr[i + xx]).join(" ") // for validation
                    this.index[right_ngram].diac = this.getNgram(this.original_target_words, i) // for debugging
                }
            }
            if (this.index[right_ngram].alt.findIndex(x => x.word == this.original_target_words[i]) == -1) {
                this.index[right_ngram].alt.push({
                    ngram: this.getNgram(this.original_target_words, i),
                    // undiac: this.index[right_ngram].normalized_word,
                    word: arr[i],
                    counter: 1
                })
            }
            this.index[right_ngram].loc.push(i)
        })
        return this.index
    }

    _calculateResults() {
        var frequency_list = Object.keys(this.index).map(key => new Object({
            number: this.index[key].loc.length,
            word: key
        })).sort((a, b) => b.number - a.number).slice(0, 100)

        if (this.config.d) console.error(chalk.green("CHANGING Ngrams."))

        var not_found = Object.keys(this.index).filter(x => this.index[x].alt.length == 1).map(x => this.index[x])
        var found = Object.keys(this.index).filter(x => this.index[x].book).map(x => this.index[x])
        var hasAlt = Object.keys(this.index).filter(x => this.index[x].alt.length > 1).sort((a, b) => -this.index[a].alt.length + this.index[b].alt.length).map(x => this.index[x])
        // var hasAlt = Object.keys(this.index).filter(x=>this.index[x].alt.length > 1).sort((a,b)=>-this.index[a].alt.length + this.index[b].alt.length).map(x=>this.index[x].alt)
        // var random = parseInt(Math.random()*100)%found.length;
        this.counters.found_inComplete_occurances = found.filter(x => !this.isComplete(x.word)).map(x => x.loc.length).reduce((acc, cur) => acc + cur, 0)
        this.counters.found_inComplete_distinct = found.filter(x => !this.isComplete(x.word)).length
        this.counters.found_occurances = found.map(x => x.loc.length).reduce((acc, cur) => acc + cur, 0)
        this.counters.found_distinct = found.length
        if (this.config.d) console.error(chalk.blue("STATS diacritics found:", this.counters.found_distinct, "(distinc ngrams), with a total of appeareances=", this.counters.found_occurances))

        var books = {}
        Object.keys(this.index).forEach(x => this.index[x].alt.forEach(a => books[a.book] = (books[a.book] || 0) + 1))
        var counts = {}
        // var top_lines = not_found.forEach(x=>counts[x.line] = counts[x.line]+1||1)
        counts = Object.keys(counts).map(key => new Object({
            number: counts[key],
            line: key
        })).sort((a, b) => b.number - a.number).slice(0, 30)
        // random = parseInt(Math.random()*100)%not_found.length;
        this.counters.not_found_occurances = not_found.map(x => x.loc.length).reduce((acc, cur) => acc + cur, 0)
        this.counters.not_found_distinct = not_found.length
        this.counters.not_found_complete_occurances = not_found.filter(x => this.isComplete(x.word)).map(x => x.loc.length).reduce((acc, cur) => acc + cur, 0)
        this.counters.not_found_complete_distinct = not_found.filter(x => this.isComplete(x.word)).length
        this.counters.tokens_weThinkCompleteButNot = Object.keys(this.index).filter(x => this.index[x].weThinkCompleteButNot).length
        if (this.config.d) console.error(chalk.blue("STATS not found ngrams in Riyadh = ", not_found.length))
        if (this.config.d)
            found.forEach(v => {
                if (v.normalized_word != normalizer(v.word, this.removeDiac_normalizer_config)) {
                    console.error(v)
                    throw new Error(v)
                }
            })
        // var wordLevel = found.filter(x=>x.word==x.original_word).map(x=>x.loc.length)
        var all = Object.keys(this.index).map(x => this.index[x])
        var original_diac_letters = 0
        var all_correct_diac_letters = 0
        var all_letters = 0
        var all_diac_letters = 0

        // use a dictitionary and update word if there is only one possible diacritization 
        if (this.config.dict) {
            Object.keys(this.index).map(i => {
                var x = this.index[i]
                let allPossibleTashkeels = this.dict[x.normalized_word]
                if(!allPossibleTashkeels){
                    this.index[i].notInDict = 1
                    return
                }
                this.index[i].normalized_ambiguity = allPossibleTashkeels.length
                var possibles = this.getCompatiblePossibleTashkeels(x.word,allPossibleTashkeels)
                if(possibles.length == 1){
                	var word = possibles[0].map(xx=>xx.join("")).join("")
                    if(word != x.word)
                        this.index[i].before_dict = x.word
                	this.index[i].word = word
                }
                this.index[i].ambiguity = possibles.length
                this.index[i].initial_ambiguity = this.getCompatiblePossibleTashkeels(x.original_word,allPossibleTashkeels).length
            })
        }

        all.map(x => {
            var r = this.diacBasedAccuracy(x.word, x.original_word)
            original_diac_letters += r.original_diac_letters * x.loc.length
            all_correct_diac_letters += r.correct * x.loc.length
        })
        
        all.map(x => {
            let a = this.getHashed(x.word)
            all_letters += a.length * x.loc.length
            all_diac_letters += a.filter(x => x.length > 1).length * x.loc.length
        })


        this.counters.original_diac_letters =original_diac_letters;
        this.counters.all_correct_diac_letters =all_correct_diac_letters;
        this.counters.all_letters =all_letters;
        this.counters.all_diac_letters =all_diac_letters;
        var percent = {
            // initial_incomplete_percentage: (this.counters.tokens_inCompleteWords) / this.counters.tokens_arabic,
            // initial_true_incomplete_percentage: (this.counters.tokens_inCompleteWords + this.counters.tokens_weThinkCompleteButNot) / this.counters.tokens_arabic,
            // final_incomplete_percentage: (this.counters.found_inComplete_occurances + this.counters.not_found_occurances - this.counters.not_found_complete_occurances) / this.counters.tokens_arabic,
            found_percentage: (found.length / all.length),
            der: 1 - (all_correct_diac_letters / original_diac_letters),
            overall_coverage: all_diac_letters / all_letters,
            overall_initial_coverage: original_diac_letters / all_letters,
            from_dict_words: all.filter(x=>x.before_dict).map(x=>x.loc.length).reduce((acc, cur) => acc + cur, 0) / all.map(x=>x.loc.length).reduce((acc, cur) => acc + cur, 0),
            notInDict: all.filter(x=>x.notInDict).map(x=>x.loc.length).reduce((acc, cur) => acc + cur, 0) / all.map(x=>x.loc.length).reduce((acc, cur) => acc + cur, 0),
            ambiguity: all.filter(x=>!x.notInDict).map(x=>x.ambiguity * x.loc.length).reduce((acc, cur) => acc + cur, 0) / all.filter(x=>!x.notInDict).map(x=>x.loc.length).reduce((acc, cur) => acc + cur, 0),
            initial_ambiguity: all.filter(x=>!x.notInDict).map(x=>x.initial_ambiguity * x.loc.length).reduce((acc, cur) => acc + cur, 0) / all.filter(x=>!x.notInDict).map(x=>x.loc.length).reduce((acc, cur) => acc + cur, 0),
            normalized_ambiguity: all.filter(x=>!x.notInDict).map(x=>x.normalized_ambiguity * x.loc.length).reduce((acc, cur) => acc + cur, 0) / all.filter(x=>!x.notInDict).map(x=>x.loc.length).reduce((acc, cur) => acc + cur, 0),
        }

        return {
            found: found,
            not_found: not_found,
            frequency_list: frequency_list,
            not_found_per_line: counts,
            completeWords_sample: this.completeWords,
            counters: Object.keys(this.counters).sort().reduce((r, k) => (r[k] = this.counters[k], r), {}), // to sort keys alphanumerically
            percent: percent,
            from_dict_words: all.filter(x=>x.before_dict),
            hasAlt: hasAlt,
            books: books,
        }
    }
    diacBasedAccuracy(neww, original) {
        let a = this.getHashed(neww),
            b = this.getHashed(original)
        if (a.length != b.length) {
            console.error(chalk.red("ERROR: merge two unequal string", a, b))
            throw new Error("ERROR: merge two unequal string")
        }

        var number_of_diac_letters = b.filter(x => x.length > 1).length;
        var correct = b.filter((x, i) => {
            if (x.length == 1) return false // filter originally undicirtized letters
            // check if diacritics are same (excluding shaddah unless it is in source)
            return a[i].join("") == b[i].join("") ||
                a[i].join("").replace(/ّ/g, "") == b[i].join("")
        }).length
        // if (this.config.d) console.error(correct, number_of_diac_letters, a, b, neww, original);
        return {
            correct: correct,
            original_diac_letters: number_of_diac_letters,
            result: correct / number_of_diac_letters
        }
    }

    getCompatiblePossibleTashkeels(word,allPossibleTashkeels) {
        let a = this.getHashed(word)
        let nor = normalizer()
        return allPossibleTashkeels.map(xx => nor.normalize_diac(xx))//.replace(nor.regexp.p_alef,"ا"))
            .map(xx => this.getHashed(xx))
            // filter only compatible
            .filter((possible, ii) => {
                if(possible.length != a.length)
                    return false;
            	// find a letter that has incompatible diacritization so we can reject
                return possible.findIndex((letter, i) => {
                    if (letter[0] != a[i][0]) {
                        if(this.config.d) console.error("not same undiac", letter[0], a[i][0], word, allPossibleTashkeels[ii])
                        return true
                    }
                    //our word has no tashkeel: no problem
                    if (a[i].length == 1)
                        return false
                    //our word tashkeel is within complement 
                    return letter.join("").indexOf(a[i].join("")) !== 0
                }) == -1;
            })
    }
    _processFile(file_text, book) {
        if (this.config.d) console.error(chalk.green("READING file=", book))
        if (this.config.d) console.error(chalk.green("NORMALIZING it."))
        var words = normalizer(file_text, this.keepDiac_normalizer_config).replace(/\n/g, " ± ").split(/ /)
        var words_normalized = normalizer(file_text, this.removeDiac_normalizer_config).replace(/\n/g, " ± ").split(/ /)

        this._checkTwoWordListIfAligned(words, words_normalized)

        // var current_line = 0
        if (this.config.d) console.error(chalk.green("INDEXING it."))
        words.forEach((w, i, arr) => {
            //has no taskeel!
            var right_ngram = this.getNgram(words_normalized, i)
            if (!/[\u064B-\u0652]/.test(w)) {
                return
            }

            // NEW
            if (!this.index[right_ngram]) { // || this.index[w].length>1000)
                return
            }
            if (typeof this.index[right_ngram].word !== "string") {
                console.error(this.index[right_ngram])
                throw new Error("typeof this.index[right_ngram].word !== 'string'")
            }
            if (this.index[right_ngram].alt.findIndex(x => x.word == w) == -1) {
                this.index[right_ngram].alt.push({
                    ngram: this.getNgram(arr, i),
                    // undiac: this.index[right_ngram].normalized_word,
                    word: w,
                    book: book,
                    counter: 1
                })
            } else
                this.index[right_ngram].alt.find(x => x.word == w).counter++
        })
    }
    getHashed(word) {
        var arr = []
        var current_letter = 0
        var toHash = (ch, arr, word) => {
            if (ch.charCodeAt(0) >= 1611 && ch.charCodeAt(0) <= 1618 || ["œ", "™", "£", "¢", "∞", "§"].indexOf(ch) >= 0) {
                if (!arr[current_letter] && this.config.d) {
                    if (this.config.d) console.error(chalk.green("WARNING word start with diac!"), word)
                    return
                }
                // if(!Array.isArray(arr[current_letter]))
                // console.log(arr[current_letter],arr)
                arr[current_letter].push(ch)
            } else {
                arr.push([ch])
                current_letter = arr.length - 1
            }
        }

        word.split("").forEach((ch) => toHash(ch, arr, word))
        return arr
    }
    isArabic(word) {
        return this.arb_letter.test(word)
    }
    isComplete(word) {
        var arr = this.getHashed(word)
        var full_word = arr.map(x => x[0]).join("")
        if (/ا?لله/.test(full_word))
            return true
        for (var i in arr) {
            if (arr[i].length <= 1) { // has no tashkeel

                // okay if next letter is madd
                i = parseInt(i)
                var nextLetter = i < arr.length - 1 ? arr[i + 1][0] : '';
                var prevLetter = i > 0 ? arr[i - 1][0] : '';
                if (nextLetter == '\u0627' || nextLetter == '\u0648' || nextLetter == '\u064A')
                    continue
                // .. or is a madd
                if (arr[i] == '\u0627' || arr[i] == '\u0648' || arr[i] == '\u064A' || arr[i] == '\u0649')
                    // but it cannot be at begining except alif
                    if (i > 0 || arr[i] == '\u0627')
                        continue

                // .. or is a madd
                if (arr[i] == 'إ')
                    continue

                // if it is det al (AL altareef)
                if (prevLetter[0] == "ا" && arr[i][0] == "ل")
                    continue
                return false
            }
        }
        return true
    }

    mergeTwoWords(best_replace, target_word) {
        let a = this.getHashed(target_word),
            b = this.getHashed(best_replace)
        if (a.length != b.length) {
            console.error(chalk.red("ERROR: merge two unequal string", a, b))
            throw new Error("ERROR: merge two unequal string")
        }
        return a.map((x, i) => a[i].length > b[i].length ? a[i].join("") : b[i].join("")).join("")
    }
}

if (require.main === module) { // called directly
    var argv = require('yargs')
        .usage('Usage: $0 -t file_to_be_diacritized --corpus source_folder')
        .demand('t').describe('t', 'Target corpus')
        .default('ngram', 5).describe('ngram', 'Ngram to be used')
        .default('filter', '.*').describe('filter', 'filter regexp for files in corpus folder')
        .demand('corpus').describe('corpus', 'The corpus to retrieve diacritized from.')
        .describe('stats', 'filename to write JSON of useful statistical information.')
        .describe('o', 'filename for diacritized text output.')
        .boolean("d").describe("d", "debug")
        .argv
    var av = new Vowelizer(argv);
    av.train()
} else {
    module.exports = (argv) => {
        "use strict";
        return new Vowelizer(argv)
    }
}