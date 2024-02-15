const run_highlighter = (()=>{
	const CODE_CLASSNAME = "code";

	const JS_CODE_QUERY_SELECTOR = "script."+CODE_CLASSNAME;
	const PRISM_JS_CLASS = "language-javascript match-braces rainbow-braces";

	const CSS_CODE_QUERY_SELECTOR = "style."+CODE_CLASSNAME;
	const PRISM_CSS_CLASS = "language-css match-braces";

	const HTML_CODE_QUERY_SELECTOR = "iframe."+CODE_CLASSNAME;
	const PRISM_HTML_CLASS = "language-html match-braces rainbow-braces";

	const convert = (selector, classNames)=>{
		let codeElems = document.querySelectorAll(selector);
		[...codeElems].forEach(codeElem=>{
			const PRE = document.createElement("pre");
			const CODE = document.createElement("code");
			CODE.textContent = codeElem.textContent.slice(1);
			CODE.classList = CODE_CLASSNAME + ' ' + classNames;
			PRE.append(CODE);
			document.body.replaceChild(PRE, codeElem);
		});
	};

	const process = ()=>{
		// js code
		convert(JS_CODE_QUERY_SELECTOR, PRISM_JS_CLASS);
		// css code
		convert(CSS_CODE_QUERY_SELECTOR, PRISM_CSS_CLASS);
		// html code
		convert(HTML_CODE_QUERY_SELECTOR, PRISM_HTML_CLASS);
	};

	return process;
})();