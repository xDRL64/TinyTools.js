(async()=>{

	// docs import listing

	const repo_base = 'https://raw.githubusercontent.com/xDRL64/TinyTools.js/master/';

	const docs_css  = 'docs/SuperCustomContextMenu/resources/docs.css';
	const prism_css = 'docs/resources/prism.css';

	const prism_js        = 'docs/resources/prism.js';
	const runHighlight_js = 'docs/resources/run_highlighter.js';
	const footer_js       = 'docs/SuperCustomContextMenu/resources/footer.js';

	const list = [
		{type:'css', url:repo_base+docs_css},
		{type:'css', url:repo_base+prism_css},

		{type:'js', url:repo_base+prism_js},
		{type:'js', url:repo_base+runHighlight_js},
		{type:'js', url:repo_base+footer_js},
	];

	// import process lib

	const get_content = async(url)=>{
		const response = await fetch(url);
		return await response.text();
	};

	const mime = {css:'text/css', js:'text/javascript'};

	const to_blobDataURL = async(type, data)=>{
		const asyncProcess = (resolve, reject)=>{
			const blob = new Blob([data], {type: mime[type]});
			const reader = new FileReader();
			reader.readAsDataURL(blob);
			reader.onload = ()=>{
				resolve(reader.result); // data url (base64)
			};
		};
		return await (new Promise(asyncProcess)).then(r=>r);
	};

	const elemMaker = {};

	elemMaker.css = (url)=>{
		const elem = document.createElement('link');
		elem.rel = 'stylesheet';
		elem.href = url;
		return elem;
	};

	elemMaker.js = (url)=>{
		const elem = document.createElement('script');
		elem.src = url;
		elem.async = false;
		elem.type = mime['js'];
		return elem;
	};

	// import running

	for(const item of list){ // convert url to dataURL
		const {type, url} = item;
		let data = await get_content(url);
		item.url = await to_blobDataURL(type, data);
	}

	list.forEach( ({type,url})=>document.head.appendChild(elemMaker[type](url)) );
	
	console.log('importer.js END');
	const code = `//let b=document.body;
	              //let c=[...document.body.children];
				  //c.forEach(e=>b.removeChild(e));
				  //c.forEach(e=>b.appendChild(e));
				  window.xDRL64_docsResourcesImporter_ends = true;`;
	const custScriptURL = await to_blobDataURL('js', code);
	document.head.appendChild(elemMaker['js'](custScriptURL))
})().then();