let SuperCustomContextMenu = {}; // API Receiver

((SCCM)=>{ // API Exporter


	let core = {};

	core.themeLib = (()=>{

		const mix_base2 = (full_base, part_base)=>{
			// inject part_base in a copy of full_base
			// (mix subprops at depth : style/class/css/behaviors)
			B_to_A = (A, B)=>{
				for(const b in B)
					if(b==='behaviors' || b==='style' || b==='class' || b==='css'){
						if(b === 'behaviors') A[b] = {...A[b], ...B[b]};
						if(b === 'style') A[b] = {...A[b], ...B[b]};
						if(b === 'class') A[b] = [...A[b], ...B[b]];
						if(b === 'css') A[b] += B[b];
					}else
						B_to_A(A[b], B[b]);
			}
			// structuredClone cannot copy object containing function as props
			const {behaviors} = full_base; delete full_base.behaviors;
			const clone_base = structuredClone(full_base);
			full_base.behaviors = behaviors;
			clone_base.behaviors = behaviors;
			// recursive process
			B_to_A(clone_base, part_base);
			return clone_base;
		};

		const mix_base = (full_base, part_base)=>{
			const new_base = {};
			['_all', 'root', 'layer', 'menu', 'item',].forEach(prop=>{
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

			return {
				root  : {
					style : mix_style('root', base, sccm, usr),
					class : merge_class('root', base, sccm, usr),
				},
				layer : {
					style : mix_style('layer', base, sccm, usr),
					class : merge_class('layer', base, sccm, usr),
				},
				menu  : {
					style : mix_style('menu', base, sccm, usr),
					class : merge_class('menu', base, sccm, usr),
				},
				item  : {
					style : mix_style('item', base, sccm, usr),
					class : merge_class('item', base, sccm, usr),
				},
			};
		};

		const apply_init = (dst_elem, src_init)=>{
			// apply style
			const dst = dst_elem.style;
			const src = src_init.style;
			for(const prop in src) dst[prop] = src[prop];
			// apply class
			dst_elem.className = src_init.class;
		};

		const build_init = (base, sccm, usr)=>{
			const inits = compile_init(base, sccm, usr);
			return {
				root(elem) { apply_init(elem, inits.root);  },
				layer(elem){ apply_init(elem, inits.layer); },
				menu(elem) { apply_init(elem, inits.menu);  },
				item(elem) { apply_init(elem, inits.item);  },
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

		const make_themeGenerator = (base, sccm)=>{
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
				theme.init = build_init(base, sccm, usrTheme);
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

	core.providing = (()=>{

		const {mix_base, make_themeGenerator} = core.themeLib;

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
						menu.style.opacity = 1;
						menu.style.pointerEvents = 'auto';
						menu[uKey].elems.get_items()
							.filter(item=>item[uKey].elems.get_submenu())
								.forEach(item=>item[uKey].update_rect());
					};
				},
				closeMenu_method : (uKey)=>{
					return (menu)=>{
						menu.style.opacity = 0.1;
						menu.style.pointerEvents = 'none';
					};
				},
				setClosedMenu_method : (uKey)=>{
					return (menu)=>{
						menu.style.opacity = 0.1;
						menu.style.pointerEvents = 'none';
					};
				},
				hoverItem_method : (uKey)=>{
					return (item)=>{
						item.style.backgroundColor = 'crimson';
					};
				},
				leaveItem_method : (uKey)=>{
					return (item)=>{
						item.style.backgroundColor = 'lightgrey';
					};
				},
				inpathItem_method : (uKey)=>{
					return (item)=>{
						item.style.backgroundColor = 'orange';
					};
				},
				outpathItem_method : (uKey)=>{
					return (item)=>{
						item.style.backgroundColor = 'lightgrey';
					};
				},
				disableItem_method : (uKey)=>{
					return (item)=>{
						item.style.color = 'green';
					};
				},
				enableItem_method : (uKey)=>{
					return (item)=>{
						item.style.color = 'black';
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

		// EMPTY THEME
		//

		// contains only differences from its base
		const empty_base = mix_base(_base, { // empty style base
			menu : {
				style : {
					left : '100%',
				},
			},
		});

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

		// MUST HAVE ALL TREE PROPS EVENT IF ARE EMPTY
		const default_base = { // minimal style base
			_all : {
				style : {
					..._base._all.style,
				},
				class : [
					..._base._all.class,
				],
				css : (
					_base._all.css + ''
				),
			},
			root : {
				style : {
					..._base.root.style,
				},
				class : [
					..._base.root.class,
				],
				css : (
					_base.root.css + ''
				),
			},
			layer : {
				style : {
					..._base.layer.style,
				},
				class : [
					..._base.layer.class,
				],
				css : (
					_base.layer.css + ''
				),
			},
			menu : {
				style : {
					..._base.menu.style,
					left : '100%',
				},
				class : [
					..._base.menu.class,
				],
				css : (
					_base.menu.css + ''
				),
			},
			item : {
				style : {
					..._base.item.style,
				},
				class : [
					..._base.item.class,
				],
				css : (
					_base.item.css + ''
				),
			},
			behaviors : {
				// binders
				//
				..._base.behaviors,
			},
		};

		// MUST HAVE AT LEAST ALL TYPES (_all/root/layer/menu/item/behaviors) EVENT IF ARE EMPTY
		const sccm_default = { // SCCM original default style
			_all : {
				css : '\n'
				    + '.original-general{'
				    + '  padding : 2px;'
				    + '}\n',
			},
			root : {},
			layer : {},
			menu  : {
				class : ['original-general', 'original-menu'],
				css : '\n'
				    + '.original-menu{'
				    + '  background-color : grey;'
				    + '  gap : 2px;'
				    + '  top : -2px;'
				    + '}\n',
			},
			item  : {
				class : ['original-general', 'original-item'],
				css : '\n'
				    + '.original-item{'
				    + '  background-color : lightgrey;'
				    + '}\n',
			},
			behaviors : {
				
			},
		};

		

		const empty = make_themeGenerator(empty_base, sccm_empty);
		const def = make_themeGenerator(default_base, sccm_default);

		return {empty, defaut:def, };

	})();

	// debug export
	SCCM.providing ??= {};

	SCCM.providing.set_empty = (user_key, theme)=>{ core.providing.empty.set(user_key, theme); };
	SCCM.providing.get_empty = ()=>{ return core.providing.empty.get(); };

	SCCM.providing.set_default = (user_key, theme)=>{ core.providing.defaut.set(user_key, theme); };
	SCCM.providing.get_default = ()=>{ return core.providing.defaut.get(); };





	// independant Rect System (external lib)
	//

	// renames 'width' as 'w' and 'height' as 'h'
	// captures rect bounding by according boxSizing
	let get_rect = (elem, boxSizing)=>{
		let tmp_boxSizing = elem.style.boxSizing;
		elem.style.boxSizing = boxSizing;

		let r = elem.getBoundingClientRect();
		elem.style.boxSizing = tmp_boxSizing;

		return {x:r.x, y:r.y, w:r.width, h:r.height};
	};

	let get_borderRect = (elem)=>{
		return get_rect(elem, 'border-box');
	};

	let get_elemRect = (elem)=>{
		return get_rect(elem, 'content-box');
	};

	let make_itselfRectSys = (elem)=>{
		return {
			props : {x:0,y:0,w:0,h:0},
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

		let open_menu_process = ({menu, item})=>{
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

		let connect_handle = (hook)=>{
			hook.appendChild(handle);
			hook[APP] = {};
			init_elemUsrAccess(hook);
			set_elemRectSys(hook);
			usrHookElem = hook;
		};
		let disconnect_handle = ()=>{
			close_instance();
			let hook = usrHookElem;
			hook.removeChild(handle);
			delete hook[APP];
			delete hook[uKey];
			usrHookElem = null;
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
				if(elem[APP].type === core.key.ITEM) item_mouseover(elem);
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





		// base all elems
		//

		let make_sccmElem = ()=>{
			let elem = document.createElement('DIV');
				// sccm base properties
				elem[APP] = {};
			return elem;
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

			// elem init (css/html usr process)
			mainInit.root(elem);
			
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

			// elem init (css/html usr process)
			mainInit.layer(elem);
			init?.(elem);

			elem.appendChild(menu);

			return elem;
		};





		// main elem (menu/item) settings
		//

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
				get_upItem : ()=>elem[APP].itemPath.at(-1)||null,
				get_layer : ()=>elem[APP].layer,
				get_items : ()=>[...elem[APP].items],
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
			
			// core (behavior and rect)
			init_elemUsrAccess(elem);
			set_elemRectSys(elem);
			set_elemBehaviorSys(elem, behavior);
			// user prop setters
			set_menuPropSetters(elem);
			// user linked elem access (getters/updaters)
			set_menuElemsAccess(elem);

			// elem init (css/html usr process)
			mainInit.menu(elem);
			init?.(elem);

			// layer
			elem[APP].layer = make_sccm_layer(elem, layerInit);

			return elem;

		};



		// item
		//

		let catch_itemReaction = (item, scopedReaction, reactionType)=>{

			if(item[APP].pointer === core.key.BUSYLOCK)
			if(item[APP].locking[reactionType]){ // 'opensubmenu' || 'hoveritself'
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
				set_txt(txt)      { elem.textContent = txt; },
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

			// elem init (css/html usr process)
			mainInit.item(elem);
			init?.(elem);

			return elem;
		};



		
		// returns : a menu for recursive process
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

				item.textContent = txt;
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
		core.providing.defaut.set(uKey);
		const { 
			css      : default_css,
			initELEM : defaultInit,
			behavior : defaultBehavior,
		} = core.providing.defaut.get();

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
	let create_menuStructure = (usrTemplate, usrMemKey)=>{
		// OWN CHECK
		return core.create_menuStructure(usrTemplate, usrMemKey); // protect 'this'
	};
	SCCM.create_menu = create_menuStructure; // export feature


	


})(SuperCustomContextMenu);