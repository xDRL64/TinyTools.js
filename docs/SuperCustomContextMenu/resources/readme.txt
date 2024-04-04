ALL HTML DOCS PAGE USE THIS HARDCODED HEADER SCRIPT :

<head>
	<script async="false">(async()=>{ // FILES IMPORTER WRAPPER
		// configurable :
			const urlBase = 'https://raw.githubusercontent.com/xDRL64/TinyTools.js/';
			const filePath = 'master/docs/SuperCustomContextMenu/resources/importer.js';
		// process :
			const url = urlBase + filePath;
			const importer = document.createElement('script');
			importer.src = 'data:text/javascript;base64,' + btoa(await(await(fetch(url))).text());
			importer.async = false;
			document.head.appendChild(importer);
	})().then();</script>
</head>


ALL HTML DOCS PAGE USE THIS HARDCODED BODY END SCRIPT :

<body>
	<script>
		// configurable :
			const finalize_page = ()=>{
				run_highlighter();
				append_footer();
			};
		// process :
			const waitfor_docsResources = ()=>{
				if(window.xDRL64_docsResourcesImporter_ends) finalize_page();
				else requestAnimationFrame(waitfor_docsResources);
			};
			waitfor_docsResources();
	</script>
</body>