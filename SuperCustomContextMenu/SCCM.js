let SuperCustomContextMenu = {}; // API Receiver

((SCCM)=>{ // API Exporter

	let core = {};



	core.highLevelCheck = {
		DOM_connexion(connectableElem){
			if(!connectableElem.isConnected)
				throw new Error('Menu Handle is not connected to the DOM');
		},
	};




	// rename 'width' as 'w' and 'height' as 'h'
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






	

	// TODO remove that later
	// make -> build -> create
	// behavior priority : elemselfbehavior || rootmainbehavior || sccmdefaultbehavior






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

		HOVER    : Symbol('SCCM_HOVER'),
		LEAVE    : Symbol('SCCM_LEAVE'),
		OUTOF    : Symbol('SCCM_OUTOF'),
	};

	core.build_menuStructure = function(usrTemplate, usrMemKey){
		
		if(!usrTemplate.mainMenu) throw new Error('SCCM : menu root missing mainMenu in template menu Object.');

		let check_handleOpen = ()=>{
			if(!instance.isOpen) console.warn('SCCM : Attention main menu is currently closed');
		};

		let check_handleConnexion = ()=>{
			core.highLevelCheck.DOM_connexion(handle);
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
			instance.menuChain.slice(newDepth+1).forEach(menu=>_hide(menu));
			instance.menuChain = instance.menuChain.slice(0,newDepth+1);
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
				update_itemPath_process(root[APP].itemPath);
				close_menu_process(root[APP].depth);
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
					_show(item);
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

			update_itemPath_process(menu[APP].itemPath);
			// close_subMenu(menu[APP].depth); TODO maybe not
		};

		let item_mouseover = (item)=>{
			if(instance.hoverItem !== item){
				
				menu_mouseover(item[APP].inMenu);
				close_menu_process(item[APP].depth);

				// if available
				if(item[APP].interact === core.key.USABLE){
	
					// hover current item
					
					let reaction = ()=>_hover(item); // ORIGINALLY : _hover(item);
					catch_itemReaction(item, reaction, 'hoveritself')?.();
	
					// content : submenu case
					if(item[APP].contentType === core.key.SUBMENU){
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
			if(instance.isOpen){
				_leave(); // leave current item
				instance.hoverMenu = null;
				// close_submenu(depth) TODO maybe not
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

			// public features :
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
			// public features :
			// - does check tests
			// - protects 'this' var
			// - exports in user access
			elem[uKey].behavior.set_method = (name,process)=>{
				check_coreInitOnly();
				elem[APP].behavior[name] = process;
			};
			elem[uKey].behavior.inherite_from = (inherited)=>{
				check_coreInitOnly();
				let current = elem[APP].behavior;
				elem[APP].behavior = {...current, ...inherited}; // 'inherited' gets priority
			};
		};





		// menu
		//

		let set_menuElemsAccess = (elem)=>{
			// public features :
			// ! does check tests TODO
			// - protects 'this' var
			// - exports in user access
			elem[uKey].elems = {
				get_hook : ()=>instance.get_hook(),
				get_root : ()=>instance.get_root(),
				get_upItem : ()=>elem[APP].itemPath.at(-1)||null,
				get_layer : ()=>elem[APP].layer,
				get_items : ()=>[...elem[APP].items],
			};
		};

		let set_menuPropSetters = (elem)=>{
			elem[uKey].propSetters = {
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
			// public features :
			// ! does check tests TODO
			// - protects 'this' var
			// - exports in user access
			elem[uKey].locking = {
				set_opensubmenu(bool){ elem[APP].locking.opensubmenu = bool; },
				set_hoveritself(bool){ elem[APP].locking.hoveritself = bool; },
				lock_reaction()      { elem[APP].pointer = core.key.BUSYLOCK; },
				unlock_reaction()    { elem[APP].pointer = core.key.READYNOW; release(elem); },
			};
			const release = release_itemReactions;
		};

		let set_itemElemsAccess = (elem)=>{
			// public features :
			// ! does check tests TODO
			// - protects 'this' var
			// - exports in user access
			elem[uKey].elems = {
				get_hook : ()=>instance.get_hook(),
				get_root : ()=>instance.get_root(),
				get_menu : ()=>elem[APP].inMenu,
				get_submenu : ()=>elem[APP].contentType===core.key.SUBMENU ? elem[APP].content : null,
			};
		};

		let set_itemPropSetters = (elem)=>{
			elem[uKey].propSetters = {
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

		const mainBehavior = {/*...defaultBehavior,*/ ...(usrTemplate.settings?.behavior||{})}; // TODO defaultBehavior

		const mainInit = {/*...defaultInit,*/ ...(usrTemplate.settings?.initELEM||{})}; // TODO defaultInit

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
		usrStyle.textContent = usrTemplate.settings?.css || ''; // TODO || defaultStyle

		container.appendChild(usrStyle);
		container.appendChild(root);

		return handle;
	};

	// MAKES PUBLIC FEATURE :
	// - does no check tests
	// - protects 'this' var
	let build_menuStructure = (usrTemplate, usrMemKey)=>{
		// OWN CHECK
		return core.build_menuStructure(usrTemplate, usrMemKey); // protect 'this'
	};
	SCCM.create_menu = build_menuStructure; // export feature


})(SuperCustomContextMenu);