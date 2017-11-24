# arabic-vowelizer
A tool for accurate diacritization of highly cited texts by automatically “borrowing” diacritization from other citations.

## Methodology
1.	It converts target text into a list of word n-grams, with reference to its locations in text, diacritized and undiacritized versions of the center word.
2.	It reads documents in source corpora sequentially. For each n-gram that is in our list, it builds a list of variant diacritizations of the centre word, and counts the number of occurrences of that diacritization. 
3.	Once finished, variants are sorted by the number of occurrences.
4.	centre words variants are merge: The merge procedure is done letter by letter, and for every letter, only candidate diacritics that do not contradict with one existing are merged. This prevent infrequent diacritization from bubbling up to the surface diacritization.
5.	We replace centre word’s locations in the text with the new diacritized version.


## Install
`npm install aosaimy/arabic-vowelizer`

## Usage
```
Usage: main -t file_to_be_diacritized --corpus source_folder

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]
  -t         Target corpus                                            [required]
  --ngram    Ngram to be used                                       [default: 5]
  --filter   filter regexp for files in corpus folder            [default: ".*"]
  --corpus   The corpus to retrieve diacritized from.                 [required]
  --stats    filename to write JSON of useful statistical information.
  -o         filename for diacritized text output.
  -d         debug                                                     [boolean]
```

## Test
This scripts has its own unit testing. You can add yours to `test/` folder. To run unit tests, run  `npm test`.
