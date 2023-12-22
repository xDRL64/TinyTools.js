let SuperCustomContextMenu = {}; // API Receiver

((SCCM)=>{ // API Exporter


	let core = {};

	core.themeLib = (()=>{

		const mix_base = (full_base, part_base)=>{
			// accepts : _all/root/layer/menu/item/behaviors
			const new_base = {};
			['_all', 'root', 'layer', 'menu', 'item'].forEach(prop=>{
				new_base[prop] = {
					style : {...full_base[prop].style, ...(part_base[prop]?.style||{})},
					class : [...full_base[prop].class, ...(part_base[prop]?.class||[])],
					css   : full_base[prop].css + (part_base[prop]?.css||''),
				};
			});
			
			new_base.behaviors = {...full_base.behaviors, ...(part_base.behaviors||{})};

			return new_base;
		};

		const collect_css = (base, sccm, usr)=>{
			return (
				base._all.css        + base.root.css        + base.layer.css        + base.menu.css        + base.item.css +
			    (sccm._all.css||'')  + (sccm.root.css||'')  + (sccm.layer.css||'')  + (sccm.menu.css||'')  + (sccm.item.css||'') +
			    (usr?._all?.css||'') + (usr?.root?.css||'') + (usr?.layer?.css||'') + (usr?.menu?.css||'') + (usr?.item?.css||'')
			);
		};

		const mix_style = (type, base, sccm, usr)=>{
			return {
				// _all                    // (root/layer/menu/item)
				...(base._all.style),      ...(base[type].style),       // base
				...(sccm._all.style||{}),  ...(sccm[type].style||{}),   // sccm
				...(usr?._all?.style||{}), ...(usr?.[type]?.style||{}), // usr
			};
			// priority : { ...base._all, ...base.type, ...sccm._all, ...sccm.type, ...usr._all, ...usr.type }
		};

		const merge_class = (type, base, sccm, usr)=>{
			return [...new Set([
				// _all                    // (root/layer/menu/item)
				...(base._all.class),      ...(base[type].class),       // base
				...(sccm._all.class||[]),  ...(sccm[type].class||[]),   // sccm
				...(usr?._all?.class||[]), ...(usr?.[type]?.class||[]), // usr
			])].join(' ');
			// priority : { ...base._all, ...base.type, ...sccm._all, ...sccm.type, ...usr._all, ...usr.type }
		};

		const compile_init = (base, sccm, usr)=>{
			const init = {root:null, layer:null, menu:null, item:null};
			for(const type in init) init[type] = {
				style : mix_style(type, base, sccm, usr),
				class : merge_class(type, base, sccm, usr),
			}
			return init;
		};

		const apply_init = (dst_elem, src_init)=>{
			// apply style
			const dst = dst_elem.style;
			const src = src_init.style;
			for(const prop in src) dst[prop] = src[prop];
			// apply class
			dst_elem.className = src_init.class;
		};

		const build_init = (base, sccm, usr, {addon_init, usrKey})=>{
			const inits = compile_init(base, sccm, usr);
			return {
				root(elem) { apply_init(elem, inits.root);  addon_init?.root?.(elem, usrKey); },
				layer(elem){ apply_init(elem, inits.layer); addon_init?.layer?.(elem, usrKey); },
				menu(elem) { apply_init(elem, inits.menu);  addon_init?.menu?.(elem, usrKey); },
				item(elem) { apply_init(elem, inits.item);  addon_init?.item?.(elem, usrKey); },
			};
		};

		const bind_behavior = (binders, uKey)=>{
			const binded = {};
			for(const behavior in binders)
				binded[behavior] = binders[behavior](uKey);

			return binded;
		};

		const mix_behavior = (base, sccm, usr, uKey)=>{
			return {
				...bind_behavior(base.behaviors, uKey),
				...bind_behavior(sccm.behaviors, uKey),
				...(usr?.behavior||{}),
			};
		};

		const make_themeGenerator = (base, sccm, addon_init)=>{
			const theme = {};

			theme.css = null;
			theme.init = null;
			theme.behavior = null;
			theme.uKey = null;
	
			theme.set = (usrKey, usrTheme)=>{
				if(!usrKey) return;
				theme.uKey = usrKey;
				// css collecting
				theme.css = collect_css(base, sccm, usrTheme);
				// style mixing / class merging
				theme.init = build_init(base, sccm, usrTheme, {addon_init, usrKey});
				// behavior binding and mixing
				theme.behavior = mix_behavior(base, sccm, usrTheme, usrKey);
			};
	
			theme.get = ()=>{
				return {
					css      : theme.css,
					initELEM : theme.init,
					behavior : theme.behavior,
				};
			};

			return theme;
		};

		return {mix_base, make_themeGenerator};
	})();

	core.theme = (()=>{

		const {mix_base, make_themeGenerator} = core.themeLib;

		// THEME TEMPLATE BASES
		//

		// MUST HAVE ALL TREE PROPS EVENT IF ARE EMPTY
		const _base = { // minimal style base
			_all : {
				style : {},
				class : [],
				css : '',
			},
			root : {
				style : {
					position : 'relative',
					userSelect : 'none',
				},
				class : [/*StringArray*/],
				css : '',
			},
			layer : {
				style : {
					width : 0,
					height : 0,
					position : 'absolute',
					pointerEvents : 'none',
				},
				class : [/*StringArray*/],
				css : '',
			},
			menu : {
				style : {
					pointerEvents : 'none',
					position : 'relative',  // \
					width : 'fit-content',  // | together
					height : 'fit-content', // /
					display : 'grid',
				},
				class : [/*StringArray*/],
				css : '',
			},
			item : {
				style : {
					position : 'relative',
				},
				class : [/*StringArray*/],
				css : '',
			},
			behaviors : {
				// binders
				//
				openMenu_method : (uKey)=>{
					return (menu)=>{
						menu.style.display = '';
						menu.style.pointerEvents = 'auto';
						/* menu[uKey].elems.get_items()
							.filter(item=>item[uKey].elems.get_submenu())
								.forEach(item=>item[uKey].update_rect()); */ // TODO remove on next save
						menu[uKey].elems.update_itemRects();
					};
				},
				closeMenu_method : (uKey)=>{
					return (menu)=>{
						menu.style.display = 'none';
						menu.style.pointerEvents = 'none';
					};
				},
				setClosedMenu_method : (uKey)=>{
					return (menu)=>{
						menu.style.display = 'none';
						menu.style.pointerEvents = 'none';
					};
				},
				hoverItem_method : (uKey)=>{
					return (item)=>{
						//item.style.backgroundColor = 'crimson';
					};
				},
				leaveItem_method : (uKey)=>{
					return (item)=>{
						//item.style.backgroundColor = 'lightgrey';
					};
				},
				inpathItem_method : (uKey)=>{
					return (item)=>{
						//item.style.backgroundColor = 'orange';
					};
				},
				outpathItem_method : (uKey)=>{
					return (item)=>{
						//item.style.backgroundColor = 'lightgrey';
					};
				},
				disableItem_method : (uKey)=>{
					return (item)=>{
						//item.style.color = 'green';
					};
				},
				enableItem_method : (uKey)=>{
					return (item)=>{
						//item.style.color = 'black';
					};
				},
				replaceLayer_method : (uKey)=>{
					return ({hook, root, upMenu, item, layer, menu})=>{
						// trick : ('item' must be first)
						// if item then it's submenu case
						// if menu then it's mainmenu case
						const elem = item || menu;
						const hookRect = hook[uKey].get_rect();
						const elemRect = elem[uKey].get_rect();
						layer.style.left = elemRect.x - hookRect.x;
						layer.style.top  = elemRect.y - hookRect.y;
						layer.style.width  = elemRect.w;
						layer.style.height = elemRect.h;
			
					};
				},
				
			},
		};

		// contains only differences from its base
		const withClass_part = {
			menu : {
				class : ['menu'],
			},
			item : {
				class : ['item'],
			},
			behaviors : {
				// binders
				//
				openMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.remove('closed');
						menu.style.pointerEvents = 'auto';
						menu[uKey].elems.update_itemRects();
					};
				},
				closeMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('closed');
						menu.style.pointerEvents = 'none';
					};
				},
				setClosedMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('closed');
						menu.style.pointerEvents = 'none';
					};
				},
				hoverItem_method : (uKey)=>{
					return (item)=>{
						item.classList.add('hovered');
					};
				},
				leaveItem_method : (uKey)=>{
					return (item)=>{
						item.classList.remove('hovered');
					};
				},
				inpathItem_method : (uKey)=>{
					return (item)=>{
						item.classList.add('inPath');
					};
				},
				outpathItem_method : (uKey)=>{
					return (item)=>{
						item.classList.remove('inPath');
					};
				},
				disableItem_method : (uKey)=>{
					return (item)=>{
						item.classList.add('notAvailable');
					};
				},
				enableItem_method : (uKey)=>{
					return (item)=>{
						item.classList.remove('notAvailable');
					};
				},

				// replaceLayer_method // not overwrote
			},
		};

		const class_base = mix_base(_base, withClass_part);


		const expendClass_part = {
			menu : {
				style : {
					pointerEvents : '',
				},
			},
			behaviors : {
				
				// binders
				//
				openMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('open');
						menu.classList.remove('closed');
						menu[uKey].elems.update_itemRects();
					};
				},
				closeMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('closed');
						menu.classList.remove('open');
					};
				},
				setClosedMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('closed');
						menu.classList.remove('open');
					};
				},

			},
		};

		const expClass_base = mix_base(class_base, expendClass_part);


		// contains only differences from its base
		const left100_part = {
			menu : {
				style : {
					left : '100%',
				},
			},
		}


		// EMPTY THEME
		//
		
		const empty_base = mix_base(_base, left100_part);
		const emptyClass_base = mix_base(class_base, left100_part);

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_empty = { // SCCM empty style
			_all : {},
			root : {},
			layer : {},
			menu : {},
			item : {},
			behaviors : {},
		};





		







		// DEFAULT THEME
		//

		// contains only differences from its base
		const default_base = mix_base(class_base, { // default style base
			menu : {
				style : {
					left : '100%',
				},
			},
		});

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_default = { // SCCM original default style
			_all : {
				css : '\n'
				    + '.general{'
				    + '  padding : 2px;'
				    + '}\n',
			},
			root : {},
			layer : {},
			menu  : {
				class : ['general'],
				css : '\n'
				    + '.menu{'
				    + '  background-color : grey;'
				    + '  gap : 2px;'
				    + '  top : -2px;'
				    + '}\n'
				    + '.closed{'
				    + '  opacity : 0;'
				    + '}\n',
			},
			item  : {
				class : ['general'],
				css : '\n'
				    + '.item{'
				    + '  background-color : lightgrey;'
				    + '}\n'
				    + '.inPath{'
				    + '  background-color : orange;'
				    + '}\n'
				    + '.hovered{'
				    + '  background-color : crimson;'
				    + '}\n'
				    + '.notAvailable{'
				    + '  color : green;'
				    + '}\n',
			},
			behaviors : {
				
			},
		};



		// ORIGINAL GLASS THEME
		//

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_glass = { // SCCM original glass style
			_all : {
				css : '\n'
				    + '.general{'
				    + '  padding : 2px;'
					+ '  font-size : 20;'
				    + '}\n'

					/* +`.item::before {
						content: '';
						position: absolute;
						inset: 0;
						background-color: transparent;
					}`, */
			},
			root : {},
			layer : {style:{boxShadow:'inset 0px 0px 0px 6px rgba(34, 136, 255, 0.533)'}}, // debug
			menu  : {
				class : ['general'],
				css : '\n'
				    + '.menu{'
				    //+ '  background-color : grey;'
				    + '  gap : 2px;'
				    + '  top : -2px;'
				    + '  left : 100%;'
				    + '}\n'
				    + '.main{'
				    + '  top : 0px;'
				    + '  left : 0%;'
				    + '}\n'
				    + '.closed{'
				    + '  opacity : 0.2;'
				    + '  pointer-events : none;'
				    + '}\n'
				    + '.open{'
				    + '  pointer-events : auto;'
				    + '}\n',
			},
			item  : {
				class : ['general', 'item'],
				css : '\n'
				    + '.item{'
				    + '  background-color : lightgrey;'
				    + '  padding : 4 128 4 24;'
				    + '  border-radius: 2px;'
				    + '  box-shadow: inset -3px -2px 9px 0px white;'
				    + '  background: linear-gradient(to top, #00000000 0%, #FFFFFF88 100%);'
					+ '  backdrop-filter: blur(25px);'
					// to avoid disfunctioning with blur de merde of css de merde add "text-shadow" ending by "1px 1px 25px transparent;"
					// in absolute use a "text-shadow : x y blur color" with blur value big enough
					// context : dev in vmware (pause/play not machine shutdown)
					// bug is there when chrome inspector is open
					//+ '  text-shadow: -1px 0px 0px white, 1px 1px 2px white, 1px 1px 25px transparent;'

					+ '  text-shadow: -1px 0px 0px white, 1px 1px 1px black, 1px 1px 5px white;'
					+ '  text-shadow: 1px 1px 0px white, 2px 2px 1px black;'
					+ '  color : #00817540;'

					+ '  font-family: Poppins, sans-serif;'
				    + '}\n'
				    + '.inPath{'
				    + '  background-color : orange;'
				    + '}\n'
				    + '.hovered{'
				    + '  background-color : #006dfd69;'
				    + '}\n'
				    + '.notAvailable{'
				    + '  color : green;'
				    + '}\n',
			},
			behaviors : {
				openMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('open');
						menu.classList.remove('closed');
						menu[uKey].update_rect();
						const mrect = menu[uKey].get_rect();
						const lrect = menu[uKey].elems.get_layer().getBoundingClientRect(); // TODO provide a way to get it

						// main menu
						if(menu[uKey].elems.get_chainLength() === 0){
							if(lrect.x+mrect.w > window.innerWidth) menu.style.left = `-${mrect.w}px`;
							else menu.style.left = '';
						// submenu
						}else{

							const frameRect = {x:0,y:0,w:innerWidth,h:innerHeight}; // window as

							const sides = { // declares by priotity order
								right : {
									setOpen({style:s}){s.left='100%'},
									cancel({style:s}){s.left=''},
									checkBorderList : ['r','b'],
								},
								left : {
									setOpen({style:s}){s.left=`-${mrect.w}px`},
									cancel({style:s}){s.left=''},
									checkBorderList : ['l','b'],
								},
							};
							const settings = {elem:menu, sides, frameRect};
							

							let sides2 = {
								right : {
									style : {left:'100%'},
									checkBorderList : ['r','b'],
								},
								left : {
									style : {left:`-${mrect.w}px`},
									checkBorderList : ['l','b'],
								},
							};
							sides2 = core.preventOverflowLib.build_sideRules(sides2);
							const settings2 = {elem:menu, sides:sides2, frameRect};
								
							
							

							let res = core.preventOverflowLib.__test(settings2,uKey);
							console.log(res);
						}



						menu[uKey].elems.update_itemRects();
					};
				},
				replaceLayer_method : (uKey)=>{ // TODO update this model for all
					return ({hook, root, upMenu, item, layer, menu})=>{

						const elem = item || menu;
						const hookRect = hook[uKey].get_rect();
						const rootRect = root[uKey].get_rect();
						if(item){
							const elemRect = elem[uKey].get_rect();
							layer.style.left = -rootRect.x + elemRect.x //- hookRect.x - window.scrollX;
							layer.style.top  = -rootRect.y + elemRect.y //- hookRect.y - window.scrollY;
							layer.style.width  = elemRect.w;
							layer.style.height = elemRect.h;
						}else{ // menu
							const elemRect = elem[uKey].get_rect();
							layer.style.width  = elemRect.w;
							layer.style.height = elemRect.h;
						}

			
					};
				},
			},
		};




		// SLIDING (DEFAULT) THEME
		//

		// contains only differences from its base
		const sliding_base = mix_base(class_base, { // sliding style base
			menu : {
				style : {
					left : '0%',
				},
				css : '\n'
				    + '@keyframes opening{'
				    + '  000% {pointer-events : none;}'
				    + '  100% {pointer-events : auto;}'
				    + '}\n',
			},
		});

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_sliding = { // SCCM sliding style
			_all : {
				css : '\n'
				    + '.general{'
				    + '  padding : 2px;'
				    + '}\n',
			},
			root : {},
			layer : {},
			menu  : {
				class : ['general'],
				css : '\n'
				    + '.menu{'
				    + '  background-color : grey;'
				    + '  gap : 2px;'
				    + '  top : -2px;'
				    + '  transition : left 1s, opacity 1s;'
				    //+ '  animation : opening 1s forwards;'
				    + '}\n'
				    + '.closed{'
				    + '  opacity : 0;'
				    + '}\n',
			},
			item  : {
				class : ['general', 'item'],
				css : '\n'
				    + '.item{'
				    + '  background-color : lightgrey;'
				    + '}\n'
				    + '.inPath{'
				    + '  background-color : orange;'
				    + '}\n'
				    + '.hovered{'
				    + '  background-color : crimson;'
				    + '}\n'
				    + '.notAvailable{'
				    + '  color : green;'
				    + '}\n',
			},
			behaviors : {
				// binders
				//
				openMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('open');
						menu.classList.remove('closed');
						menu.style.left = '100%';
						menu[uKey].elems.update_itemRects();
					};
				},
				closeMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('closed');
						menu.classList.remove('open');
						menu.style.left = '0%';
						menu.style.pointerEvents = 'none';
					};
				},
				setClosedMenu_method : (uKey)=>{
					return (menu)=>{
						menu.classList.add('closed');
						menu.classList.remove('open');
						menu.style.left = '0%';
						menu.style.pointerEvents = 'none';
					};
				},
			},
		};

		// everything optional (root/layer/menu/item)
		const sliding_additional_inits = {
			menu : (menu, uKey)=>{
				menu.addEventListener('transitionstart',e=>{
					console.log(e);
					if(menu.classList.contains('open')){
						menu.style.zIndex = -1;
						menu.style.pointerEvents = 'none';
					}
				});
				menu.addEventListener('transitionend',e=>{
					console.log(e);
					if(menu.classList.contains('open')){
						menu[uKey].elems.update_itemRects();
						menu.style.zIndex = menu[uKey].elems.get_chainLength()+1;
						menu.style.pointerEvents = 'auto';
					}
				});
			},
		};





		// WIN10 THEME
		//

		// contains only differences from its base
		const win10_base = mix_base(class_base, { // win10 style base
			menu : {
				style : {
					left : 'calc(100% - 3px)',
					top : '-3px', // border 1 + padding 2
				},
			},
		});

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_win10 = { // win10 style
			_all : {
				css : '\n'
				    + '.general{'
				    + '  font-size : 12;'
				    + '  font-family: "Segoe UI", Arial, sans-serif;'
				    + '}\n',
			},
			root : {},
			layer : {},
			menu  : {
				class : ['general'],
				css : '\n'
				    + '.menu{'
				    + '  background-color : #EEEEEE;'
					+ '  padding : 2px;'
					+ '  border : 1px solid #A0A0A0;'
					+ '  box-sizing : border-box;'
					+ '  box-shadow: 5px 5px 5px -5px black;'     // respects outside corners shadow pixel offset \ Use a pseudo elem ::before
					+ '  box-shadow: 5px 5px 4px -3px #00000080;' // respects inside corners shadow pixel offset  / using shadow to get perfect result
				    + '}\n'
				    + '.closed{'
				    + '  opacity : 0;'
				    + '}\n',
			},
			item  : {
				class : ['general', 'item'],
				css : '\n'
				    + '.item{'
				    + '  background-color : #EEEEEE;'
					+ '  padding : 4 128 4 32;'
					//+ '  mix-blend-mode: darken;'
				    + '}\n'
				    + '.inPath{'
				    + '  background-color : white;'
				    + '}\n'
				    + '.hovered{'
				    + '  background-color : white;'
				    + '}\n'
				    + '.notAvailable{'
				    //+ '  color : #6D6D6D;'
				    + '  color : #6A6A6A;'
				    + '}\n',
			},
			behaviors : {
				
			},
		};







		// MACOSX THEME
		//

		// contains only differences from its base
		const macosx_base = mix_base(class_base, { // macosx style base
			_all : {
				css : '\n'
				    + '.general{'
				    + '  font-size : 15;'
				    + '  font-family: "SF Pro", Arial, sans-serif;'
				    + '}\n',
			},
			menu  : {
				class : ['general'],
				css : '\n'
				    + '.menu{'
				    + '  background-color: rgba(230, 230, 230, 0.6);'
				    + '  backdrop-filter: blur(50px);'
					+ '  padding : 4px 0px;'
					+ '  border : 1px solid rgba(150, 150, 150, 0.5);'
					+ '  border-radius : 4px;'
					+ '  box-sizing : border-box;'
					+ '  box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.35);' // web ref
					+ '  box-shadow: 4px 6px 12px -4px rgba(0, 0, 0, 0.35);' // my ajustement
				    + '}\n'
				    + '.closed{'
				    + '  opacity : 0;'
				    + '}\n',
			},
			item  : {
				class : ['general', 'item'],
				css : '\n'
				    + '.item{'
				    //+ '  background-color: rgba(230, 230, 230, 0.9);'
				    + '  padding : 4 128 4 24;'
				    + '}\n'
				    + '.inPath{'
				    + '  background-color : rgba(73, 154, 251, 1);'
				    + '  color : white;'
				    + '}\n'
				    + '.hovered{'
				    + '  background-color : rgba(73, 154, 251, 1);'
				    + '  color : white;'
				    + '}\n'
				    + '.notAvailable{'
				    + '  color : #6A6A6A;'
				    + '}\n'
				    + '.asSeparator{'
				    + '  margin : 4px 0px;'
				    + '  padding : 0px;'
				    + '  height : 2px;'
				    + '  background-color : rgba(150, 150, 150, 0.3);'
				    + '}\n',
			},
		});

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_macosx_defaultMain = { // macosx default main menu style
			_all : {},
			root : {},
			layer : {},
			menu  : {
				style : {
					left : '0px',
					top : '0px',
				},
			},
			item  : {},
			behaviors : {},
		};

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_macosx_default = { // macosx default style
			_all : {},
			root : {},
			layer : {},
			menu  : {
				style : {
					left : 'calc(100% - 1px)',
					top : '-5px', // border 1 + padding 4
				},
			},
			item  : {},
			behaviors : {},
		};

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_macosx_horizontalMain = { // macosx horizontal main menu style
			_all : {},
			root : {},
			layer : {},
			menu  : {
				style : {
					left : '0px',
					top : '0px',
					gridAutoFlow : 'column',
					justifyContent : 'start',
					padding : '0px 16px',
					borderRadius : '0px',
				},
			},
			item  : {
				style : {
					padding : '4px 12px',
				},
			},
			behaviors : {
				replaceLayer_method : (uKey)=>{
					return ({hook, root, upMenu, item, layer, menu})=>{
						const hookRect = hook[uKey].get_rect();
						if(item){
							const elem = item;
							const elemRect = elem[uKey].get_rect();
							layer.style.left = elemRect.x - hookRect.x;
							layer.style.top  = elemRect.y - hookRect.y;
							layer.style.width  = elemRect.w;
							layer.style.height = elemRect.h;
						}else{ // main menu case
							layer.style.left = 0 - hookRect.x;
							layer.style.top  = 0 - hookRect.y;
							layer.style.width  = '100%';
							layer.style.height = '100%';
						}
					};
				},
			},
		};

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_macosx_horizontal2nd = { // macosx horizontal submenu of main menu style
			_all : {},
			root : {},
			layer : {},
			menu  : {
				style : {
					left : '0px',
					top : '100%',
				},
			},
			item  : {},
			behaviors : {},
		};

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_macosx_horizontal = { // macosx horizontal submenu style
			// _all : {},
			// root : {},
			// layer : {},
			// menu  : {},
			// item  : {},
			// behaviors : {},
			...sccm_macosx_default,
		};




		

		return { // object depth 2 : groups <- themes
			empty : {
				minimal : make_themeGenerator(empty_base, sccm_empty),
				withClass : make_themeGenerator(emptyClass_base, sccm_empty),
			},
			sccmOriginal : {
				default : make_themeGenerator(default_base, sccm_default),
				glass : make_themeGenerator(expClass_base, sccm_glass),
				fading : null,
				sliding : make_themeGenerator(sliding_base, sccm_sliding, sliding_additional_inits),
				slidingMain : null,
				growing : null,
				growingMain : null,
			},
			windows10 : {
				default : make_themeGenerator(win10_base, sccm_win10),
				noFading : null,
			},
			macosx : {
				defaultMain : make_themeGenerator(macosx_base, sccm_macosx_defaultMain),
				default     : make_themeGenerator(macosx_base, sccm_macosx_default),
				horizontalMain : make_themeGenerator(macosx_base, sccm_macosx_horizontalMain),
				horizontal2nd  : make_themeGenerator(macosx_base, sccm_macosx_horizontal2nd),
				horizontal     : make_themeGenerator(macosx_base, sccm_macosx_horizontal),
			},
		}
	})();

	// debug export
	SCCM.providing ??= {};
	SCCM.providing.theme ??= {};
	

	// AUTO MAKES PUBLIC FEATURES
	// - does no check
	// - protects 'this' var
	// - export to main api
	Object.keys(core.theme).forEach(gname=>{ //groupname
		const group = core.theme[gname];
		Object.keys(group).forEach(tname=>{ // themename
			SCCM.providing.theme[gname] ??= {};
			SCCM.providing.theme[gname]['set_'+tname] = (user_key, usr_theme)=>{ group[tname].set(user_key, usr_theme); };
			SCCM.providing.theme[gname]['get_'+tname] = ()=>{ return group[tname].get(); };
		});
	});


	core.preventOverflowLib = (()=>{
		// simple 2D point test in rect area
		//

		// 6 args version
		const isPoint_onRect6 = function(xp,yp, xr,yr, wr,hr){
			// args : xpoint, ypoint, xrect, yrect, wrect, hrect
			return !(xr>xp) && (xp<xr+wr) && !(yr>yp) && (yp<yr+hr); // new (alt 2)
		};

		// 2 args version
		const isPoint_onRect2 = function({x:xp,y:yp}, {x:xr,y:yr, w:wr,h:hr}){
			// args : point{x,y}, rect{x,y,w,h}
			// vars : xpoint, ypoint, xrect, yrect, wrect, hrect
			return !(xr>xp) && (xp<xr+wr) && !(yr>yp) && (yp<yr+hr); // new (alt 2)
		};

		const rect_to_box = (rect, R=rect)=>{
			// convert {x,y, w,h} to {l, r, t, b}
			return {l:R.x, r:R.x+R.w, t:R.y, b:R.y+R.h};
		};

		const inBoundRule = { // all methods return 'in bound test result' (bool)
			l : (elemL,frameL)=>elemL>frameL,
			r : (elemR,frameR)=>elemR<frameR,
			t : (elemT,frameT)=>elemT>frameT,
			b : (elemB,frameB)=>elemB<frameB,
		};

		const __test = ({elem, sides, frameRect}, user_key)=>{
			const uKey = user_key;
			const frameBox = rect_to_box(frameRect);
			
			for(let sideName in sides){

				// get side object
				const side = sides[sideName];

				// get elem rect
				side.setOpen(elem);
				elem[uKey].update_rect();
				const elemRect = elem[uKey].get_rect();
				side.cancel(elem);

				// tests open side conditions
				let inBound = true;
				for(const brd of side.checkBorderList){
					inBound = inBoundRule[brd]( elemRect[brd], frameBox[brd] );
					if( !inBound ) break;
				}
				
				if(inBound) return sideName;
			}

			return null;
		};

		// in bad using case : writes and reads to/from void
		// but does not warn about to
		// can create path end property, but cannot create ancestor chain if some are missing
		const resolve_propPath = (str_propPath='', obj_root={})=>{
			const path = str_propPath.split('.');
			const propertyName = path.pop();
			const objectRef = path.reduce( (acc,cur)=>acc[cur], obj_root );
			return {
				set : (val)=>objectRef[propertyName]=val,
				get : ()=>objectRef[propertyName],
				obj : objectRef,
				prop : propertyName,
			};
		};



		const make_sideMethods = ({style, class:classRef, otherProp})=>{ // ('class' is a reserved word)
			// style = {prop:value, ...}
			// classRef = { addset:[name, ...], remset:[name, ...], mode:'smart'||'warning' }
			// otherProp = {'prop.prop....':value, ...}
			let mem = null; // backups affected prop's current value
			return {
				setOpen(elem){
					mem = { style:{}, classRef:'', otherProp:{} };
					// style : setup
					for(const sName in style){
						mem.style[sName] = elem.style[sName]; // save prop's current value
						elem.style[sName] = style[sName]; // overwrite prop's mem
					}
					// class : setup
					mem.classRef = elem.className;
					classRef?.addset.forEach( cname=>elem.classList.add(cname) );
					classRef?.remset.forEach( cname=>elem.classList.remove(cname) );
					// other : setup
					for(const propPath in otherProp){
						const access = resolve_propPath(propPath, elem);
						mem.otherProp[propPath] = {value:access.get(), restor(){access.set(this.value)}};
						access.set(otherProp[propPath]);
					}
				},
				cancel(elem){ // restor original value
					if(mem){
						// style : setback
						for(const sName in style)
							elem.style[sName] = mem.style[sName];
						// class : setback
						if(classRef) elem.className = mem.classRef;
						// other : setback
						for(const propPath in otherProp) mem.otherProp[propPath].restor();
						// (resets to 'undefined' instead deleting for missing end chain props that were set in setOpen)
					}
					mem = null;
				},
			};
		};


		const build_sideRules = (sides)=>{
			const output = {};
			for(const sName in sides){
				const {checkBorderList} = sides[sName];
				output[sName] = { ...make_sideMethods(sides[sName]), checkBorderList };
			}
			return output;
		};

		return {__test, make_sideMethods, build_sideRules};
	})();
	SCCM.preventOverflowLib = {};
	SCCM.preventOverflowLib.__test = (settings, user_key)=>core.preventOverflowLib.__test(settings, user_key);
	SCCM.preventOverflowLib.make_sideMethods = (settings)=>core.preventOverflowLib.make_sideMethods(settings);



	// independant Rect System (external lib)
	//

	// renames 'width' as 'w' and 'height' as 'h'
	// captures rect bounding by according boxSizing
	let get_rect = (elem, boxSizing)=>{
		let tmp_boxSizing = elem.style.boxSizing;
		elem.style.boxSizing = boxSizing;

		let R = elem.getBoundingClientRect();
		elem.style.boxSizing = tmp_boxSizing;

		return {x:R.x, y:R.y, w:R.width, h:R.height, l:R.left, r:R.right, t:R.top, b:R.bottom};
	};

	let get_borderRect = (elem)=>{
		return get_rect(elem, 'border-box');
	};

	let get_elemRect = (elem)=>{
		return get_rect(elem, 'content-box');
	};

	let make_itselfRectSys = (elem)=>{
		return {
			props : {x:0,y:0,w:0,h:0, l:0,r:0,t:0,b:0},
			get_copy(){
				return {...this.props};
			},
			rect_method : get_borderRect,
			update(){
				this.props = this.rect_method(elem);
			},
			set_borderRect(bool){
				this.rect_method = bool ? get_borderRect : get_elemRect;
			},
		};
	};

	// SCCM KEYRING
	//

	core.key = {
		PRIV_MEM : Symbol('SCCM_PRIVATE_MEMORY'),
		ROOT     : Symbol('SCCM_ROOT'),
		LAYER    : Symbol('SCCM_LAYER'),
		MENU     : Symbol('SCCM_MENU'),
		OPEN     : Symbol('SCCM_OPEN'),
		CLOSED   : Symbol('SCCM_CLOSED'),
		ITEM     : Symbol('SCCM_ITEM'),
		INPATH   : Symbol('SCCM_INPATH'),
		OUTPATH  : Symbol('SCCM_OUTPATH'),
		FEATURE  : Symbol('SCCM_FEATURE'),
		SUBMENU  : Symbol('SCCM_SUBMENU'),
		USABLE   : Symbol('SCCM_USABLE'),
		UNUSABLE : Symbol('SCCM_UNUSABLE'),
		MAINELEM : Symbol('SCCM_MAINELEM'),
		AREAELEM : Symbol('SCCM_AREAELEM'),
		BUSYLOCK : Symbol('SCCM_BUSYLOCK'),
		READYNOW : Symbol('SCCM_READYNOW'),

		/* // UNUSED TODO remove at dev end
		HOVER    : Symbol('SCCM_HOVER'),
		LEAVE    : Symbol('SCCM_LEAVE'),
		OUTOF    : Symbol('SCCM_OUTOF'),
		*/
	};


	// function rank logic : set -> make -> build -> create
	//
	// style priority      : style = usr_css || default_css
	// 
	// init priotity       : main_init={...default_init,...usr_main_init}; main_init(); usr_elem_init();
	//
	// behavior priority   : behavior = {...default_behavior, ...usr_main_behavior, ...usr_elem_behavior}



	core.create_menuStructure = function(usrTemplate, usrMemKey){
		
		if(!usrTemplate.mainMenu) throw new Error('SCCM : menu root missing mainMenu in template menu Object.');

		let check_handleOpen = ()=>{
			if(!instance.isOpen) console.warn('SCCM : Attention main menu is currently closed');
		};

		let check_handleConnexion = ()=>{
			if(!handle.isConnected) throw new Error('Menu Handle is not connected to the DOM');
		};

		

		// basic primitive actions
		//

		
		let _hide = (menu)=>{
			menu[APP].state = core.key.CLOSED;
			menu[APP].behavior.closeMenu_method(menu);
		};
		let _show = (menu)=>{
			menu[APP].state = core.key.OPEN;
			menu[APP].behavior.openMenu_method(menu);
			instance.menuChain.push(menu);
		};
		let _leave = ()=>{
			instance.hoverItem?.[APP].behavior.leaveItem_method(instance.hoverItem);
			instance.hoverItem = null;
			instance.detainedItemReaction = null; // cancel detained item reactions
			check_delaySys_onLeaveItem();
		};
		let _hover = (item)=>{
			item[APP].behavior.hoverItem_method(item);
			instance.hoverItem = item;
		};

		let _outpath = (item)=>{
			item[APP].state = core.key.OUTPATH;
			item[APP].behavior.outpathItem_method(item);
		};
		let _inpath = (item)=>{
			item[APP].state = core.key.INPATH;
			item[APP].behavior.inpathItem_method(item);
		};

		let _setoff = (item)=>{
			item[APP].interact = core.key.UNUSABLE;
			item[APP].behavior.disableItem_method(item);
		};
		let _seton = (item)=>{
			item[APP].interact = core.key.USABLE;
			item[APP].behavior.enableItem_method(item);
		};




		// actions
		//

		let position_menu_process = ({menu, item}/*invocFrom*/)=>{
			let root = instance.get_root();
			let hook = instance.get_hook();
			// set position (main menu opening)
			if(menu && !item){
				let layer = menu[APP].layer;
				menu[APP].behavior.replaceLayer_method({hook, root, layer, menu});
			}
			// set position (submenu opening)
			if(!menu && item){
				menu = item[APP].content;
				let layer = menu[APP].layer;
				let upMenu = item[APP].inMenu;
				menu[APP].behavior.replaceLayer_method({hook, root, upMenu, item, layer, menu});
			}
			return menu;
		};

		let open_menu_process = (invocFrom)=>{
			
			const menu = position_menu_process(invocFrom);

			// show menu
			_show(menu);
		};

		// close submenus from a depth value
		let close_menu_process = function(newDepth){
			// TODO optimize with splice instead slice
			/* instance.menuChain.slice(newDepth+1).forEach(menu=>_hide(menu));
			instance.menuChain = instance.menuChain.slice(0,newDepth+1); */
			instance.menuChain.splice(newDepth+1).forEach(menu=>_hide(menu));
		};


		let update_itemPath_process = (newPath)=>{
			// disable highlighting of items, only if are not in newPath
			instance.itemPath.filter( item=>!newPath.includes(item) ).forEach( item=>_outpath(item) );
			// enable highlighting of items, only if are not in full_itemPath
			newPath.filter( item=>!instance.itemPath.includes(item) ).forEach( item=>_inpath(item) );
			// update full_itemPath data
			instance.itemPath = [...newPath];
		};








		// handle public features :
		//

		let connect_handle = (hook)=>{ // TODO do tests
			hook.appendChild(handle);
			usrHookElem = hook;
			if(!hook[APP]){
				hook[APP] = {};
				hook[APP].connectedCount = 0;
				init_elemUsrAccess(hook);
				set_elemRectSys(hook);
			}
			hook[APP].connectedCount++;
		};
		let disconnect_handle = ()=>{ // TODO do tests
			close_instance();
			let hook = usrHookElem;
			hook.removeChild(handle);
			hook[APP].connectedCount--;
			usrHookElem = null;
			if(hook[APP].connectedCount === 0){
				delete hook[APP];
				delete hook[uKey];
			}
		};


		let update_itemAvailability = (item)=>{
			let check = item[APP].check;
			// if there is check(), runs check() and gets result
			// if no check(), considers as available
			let available = check ? check(contextData) : true;

			if(available) _seton(item); else _setoff(item);

			return available;
		};
		let run_customUpdateProcess = (available, data, item)=>{
			item[APP].update?.(available, data, item);
		};

		let connect_usrContextData = (data)=>{
			contextData = data;
			instance.all_items.forEach(item=>{
				let available = update_itemAvailability(item);
				run_customUpdateProcess(available, data, item);
			});
		};
		let disconnect_usrContextData = ()=>{
			contextData = null;
		};


		let open_instance = ()=>{
			if(!instance.isOpen){
				instance.openSetup();
				let mainMenu = instance.get_mainMenu();
				open_menu_process({menu:mainMenu});
			}
		};

		let close_instance = ()=>{
			if(instance.isOpen){
				instance.closeSetup();
				let root = instance.get_root();
				// items
				update_itemPath_process(root[APP].itemPath);
				_leave();
				// menu
				close_menu_process(root[APP].depth);
				instance.hoverMenu = null;
			}
		};

		let update_subRects = (menu, submenuOnly/*bool*/)=>{
			if(submenuOnly)
				menu[APP].items.forEach(item=>item[APP].contentType===core.key.SUBMENU?item[APP].rect.update():null);
			else
				menu[APP].items.forEach(item=>item[APP].rect.update());
		};

		let update_layerPosition = (menu)=>{
			if(menu === instance.get_mainMenu())
				position_menu_process({menu:menu});
			else{
				const item = menu[APP].itemPath.at(-1);
				position_menu_process({item:item});
			}
		};


		let control_unfoldUntil = (menu)=>{
			if(instance.isOpen){
				// open menus
				menu[APP].itemPath.forEach(item=>{
					let submenu = item[APP].content;
					if(submenu[APP].state===core.key.CLOSED)
						open_menu_process({item:submenu[APP].itemPath.at(-1)})
				});

				// highlight items until menu
				update_itemPath_process(menu[APP].itemPath);
			}
		};

		let control_foldUntil = (menu)=>{
			if(instance.isOpen){
				// highlight items until menu
				update_itemPath_process(menu[APP].itemPath);
				// close menus
				close_menu_process(menu[APP].depth);
			}
		};


		let control_setHover = (item)=>{
			if(instance.isOpen){
				if(item !== instance.hoverItem){
					instance.hoverMenu = item[APP].inMenu;
					_leave();
					_hover(item);
				}
			}
		};
		let control_setLeave = ()=>{
			if(instance.isOpen){
				instance.hoverMenu = null;
				_leave();
			}
		};


		let send_mouseover = (item)=>{
			if(instance.isOpen){
				item_mouseover(item);
			}
		};



		// root events :
		//

		let menu_mouseover = (menu)=>{

			_leave(); // leave current item

			instance.hoverMenu = menu;

			update_itemPath_process(instance.menuChain.at(-1)[APP].itemPath);
		};

		let get_contentStatus = (item)=>{
			let open = false, submenu = false;
			if(item[APP].contentType === core.key.SUBMENU){
				submenu = true;
				if(item[APP].content[APP].state === core.key.OPEN)
					open = true;
			}
			return {alreadyOpen:open, containsMenu:submenu};
		};

		let item_mouseover = (item)=>{
			if(instance.hoverItem !== item){
				
				_leave(); // leave previous hover item
				instance.hoverMenu = item[APP].inMenu;
				update_itemPath_process(item[APP].itemPath);

				let {alreadyOpen, containsMenu} = get_contentStatus(item);

				close_menu_process(item[APP].depth + (alreadyOpen ? 1 : 0));

				// if available
				if(item[APP].interact === core.key.USABLE){
	
					// hover current item
					let reaction = ()=>_hover(item); // ORIGINALLY : _hover(item);
					catch_itemReaction(item, reaction, 'hoveritself')?.();
	
					// content : submenu case
					if(containsMenu && !alreadyOpen){
						reaction = ()=>open_menu_process({item:item}); // ORIGINALLY : open_menu_process({item:item});
						catch_itemReaction(item, reaction, 'opensubmenu')?.();
					}
				}
			}
			console.log('item_mouseover');
		};

		let check_delaySys_onLeaveItem = ()=>{
			if(instance.clear_lateProcessOnLeaveItem) clearTimeout(instance.lastLateProcessID);
		};

		let item_mouseover_foldableOnDelay = (item)=>{
			if(instance.hoverItem !== item){
				
				// normal process
				//

				_leave(); // leave previous hover item
				instance.hoverMenu = item[APP].inMenu;
				update_itemPath_process(item[APP].itemPath);

				let reaction = null;
				if(item[APP].interact === core.key.USABLE){
					// hover current item
					reaction = ()=>_hover(item); // ORIGINALLY : _hover(item);
					catch_itemReaction(item, reaction, 'hoveritself')?.();
				}

				reaction = ()=>{
					let {alreadyOpen, containsMenu} = get_contentStatus(item);
	
					close_menu_process(item[APP].depth + (alreadyOpen ? 1 : 0));
	
					// if available
					if(item[APP].interact === core.key.USABLE){
						// content : submenu case
						if(containsMenu && !alreadyOpen){
							reaction = ()=>open_menu_process({item:item}); // ORIGINALLY : open_menu_process({item:item});
							catch_itemReaction(item, reaction, 'opensubmenu')?.();
						}
					}
				};

				// delay system
				//
				const delay = instance.foldableDelay;
				if(instance.merge_delaySysWithItemReaction){ // mix delaySys witn itemReaction (expert mode)
					catch_itemReaction(item, reaction, 'delaysystem');//?.(); // cannot be refused
					instance.lastLateProcessID = setTimeout(()=>release_itemReactions(item), delay);
				}else{ // delaySys works as independant (normal mode)
					instance.lastLateProcessID = setTimeout(()=>reaction(), delay);
				}

			}
			console.log('item_mouseover_delay');
		};

		// parse ancestor and return the first parent having sccm prop as MAINELEM value.
		// if doesn't find, stop to 'root' elem and return it.
		let get_menuAncestorElem = function(elem){
			let root = instance.get_root();
			while(elem !== root){
				if(elem[APP]?.sccm === core.key.MAINELEM)
					return elem;
				elem = elem.parentElement;
			}
			return root;
		};

		// mousemouve EVENT
		let root_mouseover = (e)=>{
			console.log('root_mouseover');
			if(instance.isOpen){
				// for Chrome  : e.toElement 
				// for Firefox : e.target
				// for Firefox : e.explicitOriginalTarget (enter closed shadow root)
				// for Any?    : e.composedPath().shift() // needs to be tested
				let fromElem = e.toElement || e.target;
				let elem = get_menuAncestorElem(fromElem);
				if(elem[APP].type === core.key.MENU) menu_mouseover(elem);
				if(elem[APP].type === core.key.ITEM){
					if(instance.foldableDelay)
						item_mouseover_foldableOnDelay(elem);
					else
						item_mouseover(elem);
				}
			}
		};

		// mouseleave EVENT
		let root_mouseleave = (e)=>{
			console.log('root_leave');
			if(instance.isOpen){
				_leave(); // leave current item
				instance.hoverMenu = null;
			}
		};

		let run_itemFeatureProcess = (item, args, forced)=>{
			if(item)
			if(item[APP].interact === core.key.USABLE || forced)
			if(item[APP].contentType === core.key.FEATURE)
				item[APP].content(...args);
		};

		// click EVENT
		let root_click = (e)=>{
			console.log('root_click', e);
			if(instance.isOpen)
			if(instance.sdtClickEnable){
				let {buttons, shiftKey, ctrlKey, altKey} = e;
				let allowedEventProps = {buttons, shiftKey, ctrlKey, altKey};
				run_itemFeatureProcess(instance.hoverItem, [contextData, allowedEventProps], false);
			}
		};


		// html building part
		////////////////////////////////////////////////////////


		// public access
		//

		let init_elemUsrAccess = (elem)=>{
			elem[uKey] = {};
		};



		// handle
		//

		let make_shadowDOM = ()=>{
			let handle = document.createElement('DIV');
				handle.style.width = 0;
				handle.style.height = 0;
				handle.style.whiteSpace = 'nowrap';
				handle.style.display = 'inline-block';
				handle.style.position = 'relative';

			let container = handle.attachShadow({mode:'closed'});

			return {handle, container};
		};

		let build_handleWithShadow = ()=>{
			let {handle, container} = make_shadowDOM();

			handle[APP] = {};
			handle[APP].container = container;

			init_elemUsrAccess(handle);

			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			handle[uKey].get_menu = (id)=>{
				// NO CHECK
				return instance.all_menus.find(menu=>menu[APP].id===id);
			};
			handle[uKey].get_item = (id)=>{
				// NO CHECK
				return instance.all_items.find(item=>item[APP].id===id);
			};
			handle[uKey].get_root = ()=>{
				// NO CHECK
				return instance.get_root();
			};
			handle[uKey].get_chainLength = ()=>{
				// NO CHECK
				return instance.menuChain.length;
			};

			handle[uKey].set_itemFoldableReactionDelay = (milliseconds)=>{
				// NO CHECK
				instance.foldableDelay = milliseconds;
			};
			handle[uKey].cancel_parallelDelayedReactions = (bool)=>{
				// NO CHECK
				instance.clear_lateProcessOnLeaveItem = bool;
			};
			handle[uKey].fusion_delaysThroughItemReactSys = (bool)=>{
				// NO CHECK
				instance.merge_delaySysWithItemReaction = bool;
			};

			handle[uKey].set_clickEnable = (bool)=>{
				// NO CHECK
				instance.sdtClickEnable = bool;
			};
			handle[uKey].get_hoverElems = ()=>{
				check_handleOpen();
				return {menu:instance.hoverMenu, item:instance.hoverItem};
			};
			handle[uKey].run_hoverItemFeature = (args)=>{
				check_handleOpen();
				run_itemFeatureProcess(instance.hoverItem, [contextData, args], false);
			};
			handle[uKey].run_itemFeature = (item, args, forced)=>{
				// NO CHECK
				run_itemFeatureProcess(item, [contextData, args], forced);
			};
			handle[uKey].unfold_untilMenu = (menu)=>{
				// OWN CHECK
				control_unfoldUntil(menu);
			};
			handle[uKey].fold_untilMenu = (menu)=>{
				// OWN CHECK
				control_foldUntil(menu);
			};
			handle[uKey].set_hoverItem = (item)=>{
				// OWN CHECK
				control_setHover(item);
			};
			handle[uKey].remove_hoverItem = ()=>{
				// OWN CHECK
				control_setLeave();
			};
			handle[uKey].simulate_hoverItem = (item)=>{
				// OWN CHECK
				send_mouseover(item);
			};

			handle[uKey].add_style = (cssClassTxt)=>{
				// NO CHECK
				usrStyle.textContent += cssClassTxt;
			};
			handle[uKey].set_style = (cssClassTxt)=>{
				// NO CHECK
				usrStyle.textContent = cssClassTxt;
			};
			
			handle[uKey].set_parent = (parent)=>{
				// NO CHECK
				connect_handle(parent);
			};
			handle[uKey].remove_parent = ()=>{
				check_handleConnexion();
				disconnect_handle();
			};

			handle[uKey].open = ()=>{
				check_handleConnexion();
				open_instance();
			};
			handle[uKey].close = ()=>{
				check_handleConnexion();
				close_instance();
			};
			handle[uKey].isOpen = ()=>{
				check_handleConnexion();
				return instance.isOpen;
			};
			handle[uKey].update_chainItemRects = ()=>{
				// OWN CHECK
				instance.menuChain.forEach( menu=>update_subRects(menu, true) );
			};
			handle[uKey].update_chainLayers = ()=>{
				// OWN CHECK
				instance.menuChain.forEach( menu=>update_layerPosition(menu) );
			};

			handle[uKey].set_contextData = (data)=>{
				// NO CHECK
				connect_usrContextData(data);
			};
			handle[uKey].remove_contextData = ()=>{
				// NO CHECK
				disconnect_usrContextData();
			};

			return handle;
		};





		// base of all sccm elems (root/layer/menu/item)
		//

		let make_sccmElem = ()=>{
			let elem = document.createElement('DIV');
				// sccm base properties
				elem[APP] = {};
			return elem;
		};
		
		let set_elemRectSys = (elem)=>{
			elem[APP].rect = make_itselfRectSys(elem);

			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			elem[uKey].update_rect = ()=>{
				check_handleConnexion();
				elem[APP].rect.update();
			};
			elem[uKey].get_rect = ()=>{
				check_handleConnexion();
				return elem[APP].rect.get_copy();
			};
			elem[uKey].set_rectWithBorder = (bool)=>{
				check_handleConnexion();
				elem[APP].rect.set_borderRect(bool);
			};
		};





		// root
		//

		let reset_rootCoreProps = (elem)=>{
			elem[APP].sccm = core.key.AREAELEM;
			elem[APP].type = core.key.ROOT;

			elem[APP].depth = -1;
			elem[APP].itemPath = [];
		};

		let make_sccm_root = ()=>{
			let elem = make_sccmElem();
			// core setup
			reset_rootCoreProps(elem);

			// [public accesses] export (before [public inits] exec)
			//

			// core (rect)
			init_elemUsrAccess(elem);
			set_elemRectSys(elem);

			// [public inits] exec (now)
			//

			// elem init (css/html usr process)
			mainInit.root(elem);
			
			// [last step for root] process
			//

			elem.addEventListener('mouseover',root_mouseover);
			elem.addEventListener('mouseleave',root_mouseleave);
			elem.addEventListener('click',root_click);

			return elem;
		};





		// layer
		//

		let reset_layerCoreProps = (elem)=>{
			elem[APP].sccm = core.key.AREAELEM;
			elem[APP].type = core.key.LAYER;
		};

		let make_sccm_layer = (menu, init)=>{
			let elem = make_sccmElem();
			// core setup
			reset_layerCoreProps(elem);

			// [public accesses] export (before [public inits] exec)
			//

			// core (rect)
			init_elemUsrAccess(elem);
			set_elemRectSys(elem);

			// [public inits] exec (now)
			//
			
			// elem init (css/html usr process)
			mainInit.layer(elem);
			init?.(elem);

			// [last step for layer] process
			//

			elem.appendChild(menu);

			return elem;
		};





		// main elem (menu/item) settings
		//

		let set_elemBehaviorSys = (elem, ownBehavior)=>{
			elem[APP].behavior = {...mainBehavior, ...(ownBehavior||{}),};
			elem[uKey].behavior = {};
			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			elem[uKey].behavior.set_method = (name,process)=>{
				// NO CHECK
				elem[APP].behavior[name] = process;
			};
			elem[uKey].behavior.inherite_from = (inherited)=>{
				// NO CHECK
				let current = elem[APP].behavior;
				elem[APP].behavior = {...current, ...inherited}; // 'inherited' gets priority
			};
		};





		// menu
		//

		let set_menuElemsAccess = (elem)=>{
			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			elem[uKey].elems = {
				// NO CHECK
				//
				get_hook : ()=>instance.get_hook(),
				get_root : ()=>instance.get_root(),
				get_chainLength : ()=>instance.menuChain.length,
				get_upItem : ()=>elem[APP].itemPath.at(-1)||null,
				get_layer : ()=>elem[APP].layer,
				get_items : ()=>[...elem[APP].items],
				update_itemRects : (submenuOnly=true)=>update_subRects(elem, submenuOnly),
			};
		};

		let set_menuPropSetters = (elem)=>{
			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			elem[uKey].propSetters = {
				// NO CHECK
				set_id(id){ elem[APP].id = id; },
			};
		};

		let reset_menuCoreProps = (elem)=>{
			elem[APP].sccm = core.key.MAINELEM;
			elem[APP].type = core.key.MENU;
			elem[APP].state = core.key.CLOSED;
		};

		let make_sccm_menu = (init, behavior, layerInit)=>{
			let elem = make_sccmElem();
			// core setup
			reset_menuCoreProps(elem);
			
			// [public accesses] export (before [public inits] exec)
			//

			// core (behavior and rect)
			init_elemUsrAccess(elem);
			set_elemRectSys(elem);
			set_elemBehaviorSys(elem, behavior);
			// user prop setters
			set_menuPropSetters(elem);
			// user linked elem access (getters/updaters)
			set_menuElemsAccess(elem);

			// [public inits] exec (now)
			//

			// elem init (css/html usr process)
			mainInit.menu(elem);
			init?.(elem);

			// [last step for menu] process
			//

			// add layer
			elem[APP].layer = make_sccm_layer(elem, layerInit);

			return elem;

		};



		// item
		//

		let catch_itemReaction = (item, scopedReaction, reactionType)=>{

			let willCatch = (reactionType === 'delaysystem');

			if(item[APP].pointer === core.key.BUSYLOCK)
			if(item[APP].locking[reactionType]) // 'opensubmenu' || 'hoveritself'
				willCatch = true;
			
			if(willCatch){ 
				// if no previous item already catched
				// or if previous catched item is not current item
				if(instance.detainedItemReaction?.item !== item)
					instance.detainedItemReaction = {item, reactionStack:[]};
				
				instance.detainedItemReaction.reactionStack.push(scopedReaction);
				return null; // success reaction catching
			}

			// fail reaction catching : return original reaction
			return scopedReaction;
		};

		let release_itemReactions = (item)=>{
			if(instance.detainedItemReaction?.item === item){
				instance.detainedItemReaction.reactionStack.forEach( f=>f() );
				instance.detainedItemReaction = null
			}	
		};

		let set_itemLockingSetters = (elem)=>{
			elem[APP].locking = {
				opensubmenu : false,
				hoveritself : false,
			};
			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			elem[uKey].locking = {
				// NO CHECK
				//
				set_opensubmenu(bool){ elem[APP].locking.opensubmenu = bool; },
				set_hoveritself(bool){ elem[APP].locking.hoveritself = bool; },
				lock_reaction()      { elem[APP].pointer = core.key.BUSYLOCK; },
				unlock_reaction()    { elem[APP].pointer = core.key.READYNOW; release(elem); },
			};
			const release = release_itemReactions;
		};

		let set_itemElemsAccess = (elem)=>{
			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			elem[uKey].elems = {
				// NO CHECK
				//
				get_hook : ()=>instance.get_hook(),
				get_root : ()=>instance.get_root(),
				get_menu : ()=>elem[APP].inMenu,
				get_submenu : ()=>elem[APP].contentType===core.key.SUBMENU ? elem[APP].content : null,
			};
		};

		let set_itemPropSetters = (elem)=>{
			// PUBLIC FEATURES :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			elem[uKey].propSetters = {
				// NO CHECK
				//
				set_txt(txt)      { elem.innerHTML = txt; },
				set_id(id)        { elem[APP].id = id; },
				set_check(check)  { elem[APP].check = check; },
				set_update(update){ elem[APP].update = update; },
			};
		};

		let reset_itemCoreProps = (elem)=>{
			elem[APP].sccm = core.key.MAINELEM;
			elem[APP].type = core.key.ITEM;
			elem[APP].state = core.key.OUTPATH;
			elem[APP].pointer = core.key.READYNOW;
			elem[APP].interact = core.key.USABLE;
		};

		let make_sccm_item = (init, behavior)=>{
			let elem = make_sccmElem();
			// core setup
			reset_itemCoreProps(elem);

			// [public accesses] export (before [public inits] exec)
			//

			// core (behavior and rect)
			init_elemUsrAccess(elem);
			set_elemRectSys(elem);
			set_elemBehaviorSys(elem, behavior);
			// user prop setters
			set_itemPropSetters(elem);
			// user linked elem access (getters/updaters)
			set_itemElemsAccess(elem);
			// user lock reation setters
			set_itemLockingSetters(elem);

			// [public inits] exec (now)
			//

			// elem init (css/html usr process)
			mainInit.item(elem);
			init?.(elem);

			// [last step for item] process
			//

			// nothing special

			return elem;
		};



		
		// returns : a menu for recursive process. (return has no importance)
		// it will mainly affect vars in parent scope : instance and root.
		// arg menuRef : is the user template (full or subpart)
		// arg isMain : must be true on first recursive loop
		// arg chainElem : first elem owning {depth, itemPath}
		let builder = (menuRef, isMain, chainElem)=>{
			let {all_menus, all_items} = instance;

			// MENU
			//
			let {settings:{id, init ,behavior, layerInit}} = menuRef

			let menu = make_sccm_menu(init ,behavior, layerInit);

			menu[APP].behavior.setClosedMenu_method(menu);

			menu[APP].id = id;

			menu[APP].depth = chainElem[APP].depth + 1;
			menu[APP].itemPath = [...chainElem[APP].itemPath];

			menu[APP].items = [];

			let root = instance.get_root();
			root.appendChild(menu[APP].layer);

			all_menus.push(menu);

			// ITEMS
			// 
			(menuRef.items || []).forEach(itemRef=>{

				let {settings:{id, txt='', check, update, init ,behavior}, content} = itemRef;

				let item = make_sccm_item(init ,behavior);

				item.innerHTML = txt;
				item[APP].id = id;
				item[APP].check = check;
				item[APP].update = update;

				item[APP].inMenu = menu;
				item[APP].depth = menu[APP].depth;
				item[APP].itemPath = [...menu[APP].itemPath, item];

				// feature
				if(typeof content === 'function'){
					item[APP].contentType = core.key.FEATURE;
					item[APP].content = content;
				}
				// submenu
				else{
					item[APP].contentType = core.key.SUBMENU;
					let submenu = builder(content, false, item);
					item[APP].content = submenu;
				}

				menu[APP].items.push(item);
				menu.appendChild(item);
				all_items.push(item);
			});

			// clean itemPath of items (removes item itself in its itemPath)
			if(isMain)
				all_items.forEach(item=>item[APP].itemPath.pop());
			else
				return menu;
		};

		// build execution
		//

		const APP = core.key.PRIV_MEM;
		const uKey = usrMemKey;


		// default theme
		core.theme.sccmOriginal.default.set(uKey);
		const { 
			css      : default_css,
			initELEM : defaultInit,
			behavior : defaultBehavior,
		} = core.theme.sccmOriginal.default.get();

		// final theme

		const mainInit = {...defaultInit, ...(usrTemplate.settings?.initELEM||{})};

		const mainBehavior = {...defaultBehavior, ...(usrTemplate.settings?.behavior||{})};

		// sccm instance

		let instance = {
			isOpen : false,

			hoverMenu : null,
			hoverItem : null,

			menuChain : [],
			itemPath  : [],

			all_menus : [],
			all_items : [],

			openSetup(){
				this.isOpen = true;
				this.hoverMenu = null;
				this.hoverItem = null;
				this.menuChain = [];
				this.itemPath = [];
			},

			closeSetup(){ this.isOpen = false; },

			get_hook   : ()=>usrHookElem,
			get_handle : ()=>handle,
			get_root   : ()=>root,

			get_mainMenu(){ return this.all_menus[0]; },
		};

		instance.detainedItemReaction = null; // format : {item,reactionStack[function,...]}

		instance.foldableDelay = 100; // also considerated as flag : false if === 0 , true if > 0
		instance.merge_delaySysWithItemReaction = false; // usr can release delaySys but delaySys will release itemReaction at every delaySys' release
		instance.lastLateProcessID = null;
		instance.clear_lateProcessOnLeaveItem = true;

		instance.sdtClickEnable = true;

		let contextData = null;

		let usrHookElem = null;
		let handle = build_handleWithShadow();
		let container = handle[APP].container;
		let root = make_sccm_root();

		builder(usrTemplate.mainMenu, true, root);

		let usrStyle = document.createElement('STYLE');
		usrStyle.textContent = usrTemplate.settings?.css || default_css;

		container.appendChild(usrStyle);
		container.appendChild(root);


		// debug global vars TODO remove it
		DEBUG = {instance};



		return handle;
	};

	// MAKES PUBLIC FEATURE :
	// - does no check tests
	// - protects 'this' var
	// - export to main api
	let create_menuStructure = (usrTemplate, usrMemKey)=>{
		// OWN CHECK
		return core.create_menuStructure(usrTemplate, usrMemKey); // protect 'this'
	};
	SCCM.create_menu = create_menuStructure; // export feature


	


})(SuperCustomContextMenu);