const run_highlighter = (()=>{
	const CODE_CLASSNAME = "code";

	const JS_CODE_QUERY_SELECTOR = "script."+CODE_CLASSNAME;
	const PRISM_JS_CLASS = "language-javascript match-braces rainbow-braces";

	const CSS_CODE_QUERY_SELECTOR = "style."+CODE_CLASSNAME;
	const PRISM_CSS_CLASS = "language-css match-braces";

	const HTML_CODE_QUERY_SELECTOR = "iframe."+CODE_CLASSNAME;
	const PRISM_HTML_CLASS = "language-html match-braces rainbow-braces";

	const cut_docScope = (codeContent)=>{
		const regex = /^(\(\)=>{)(.*)(};)$/gs; // startpat : '()=>{'      // endpat : '};' 
		const result = [...codeContent.matchAll(regex)][0]; // [fullsample, startpat, codebody, endpat] size 4
		let output = (result?.length === 4) ? result[2] : codeContent;
		return output.slice(1,-1); // excludes first and last line returns
	};

	const convert = (selector, classNames)=>{
		let codeElems = document.querySelectorAll(selector);
		[...codeElems].forEach(codeElem=>{
			const PRE = document.createElement("pre");
			const CODE = document.createElement("code");

			CODE.textContent = cut_docScope(codeElem.textContent);

			CODE.classList = CODE_CLASSNAME + ' ' + classNames;
			PRE.append(CODE);
			codeElem.parentElement.replaceChild(PRE, codeElem);
		});
	};

	const process = ()=>{
		// js code
		convert(JS_CODE_QUERY_SELECTOR, PRISM_JS_CLASS);
		// css code
		convert(CSS_CODE_QUERY_SELECTOR, PRISM_CSS_CLASS);
		// html code
		convert(HTML_CODE_QUERY_SELECTOR, PRISM_HTML_CLASS);

		// run highlighter
		Prism.highlightAll();
	};

	return process;
})();