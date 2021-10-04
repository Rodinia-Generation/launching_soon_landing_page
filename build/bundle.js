
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/Tailwind.svelte generated by Svelte v3.38.3 */

    function create_fragment$8(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Tailwind", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Tailwind> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Tailwind extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tailwind",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/components/BackgroundVideo.svelte generated by Svelte v3.38.3 */

    const file$7 = "src/components/BackgroundVideo.svelte";

    // (10:0) {:else}
    function create_else_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "class", "fixed h-screen w-screen object-cover");
    			if (img.src !== (img_src_value = "./img/billowing.png")) attr_dev(img, "src", img_src_value);
    			add_location(img, file$7, 10, 4, 235);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(10:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (1:0) {#if innerWidth >= 480}
    function create_if_block$1(ctx) {
    	let video;
    	let source;
    	let source_src_value;

    	const block = {
    		c: function create() {
    			video = element("video");
    			source = element("source");
    			if (source.src !== (source_src_value = "./img/loop_content.mp4")) attr_dev(source, "src", source_src_value);
    			attr_dev(source, "type", "video/mp4");
    			add_location(source, file$7, 7, 8, 153);
    			video.autoplay = true;
    			video.loop = true;
    			attr_dev(video, "id", "myVideo");
    			attr_dev(video, "class", "fixed h-screen w-screen object-cover");
    			add_location(video, file$7, 1, 4, 28);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, video, anchor);
    			append_dev(video, source);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(video);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(1:0) {#if innerWidth >= 480}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (innerWidth >= 480) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type();
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("BackgroundVideo", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<BackgroundVideo> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class BackgroundVideo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BackgroundVideo",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/components/SocialMediaLinks.svelte generated by Svelte v3.38.3 */

    const file$6 = "src/components/SocialMediaLinks.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let a0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let a1;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let a2;
    	let img2;
    	let img2_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a0 = element("a");
    			img0 = element("img");
    			t0 = space();
    			a1 = element("a");
    			img1 = element("img");
    			t1 = space();
    			a2 = element("a");
    			img2 = element("img");
    			attr_dev(img0, "class", "p-1 xs:p-4");
    			if (img0.src !== (img0_src_value = "./img/thumbnail_linkedin.png")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$6, 4, 67, 169);
    			attr_dev(a0, "href", "https://www.linkedin.com/company/rodinia-generation/");
    			add_location(a0, file$6, 4, 4, 106);
    			attr_dev(img1, "class", "p-1 xs:p-4");
    			if (img1.src !== (img1_src_value = "./img/thumbnail_email.svg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$6, 5, 49, 282);
    			attr_dev(a1, "href", "mailto:signup@rodiniageneration.io");
    			add_location(a1, file$6, 5, 4, 237);
    			attr_dev(img2, "class", "p-1 xs:p-4");
    			if (img2.src !== (img2_src_value = "./img/thumbnail_instagram.png")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$6, 6, 59, 402);
    			attr_dev(a2, "href", "https://www.instagram.com/rodinia.generation");
    			add_location(a2, file$6, 6, 4, 347);
    			attr_dev(div, "class", "\nflex flex-col justify-end h-full\nborder border-white border-l-0 border-t-0 border-b-0\n");
    			add_location(div, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a0);
    			append_dev(a0, img0);
    			append_dev(div, t0);
    			append_dev(div, a1);
    			append_dev(a1, img1);
    			append_dev(div, t1);
    			append_dev(div, a2);
    			append_dev(a2, img2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SocialMediaLinks", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SocialMediaLinks> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class SocialMediaLinks extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SocialMediaLinks",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    // canvas-confetti v1.4.0 built on 2021-03-10T12:32:33.488Z
    var module = {};

    // source content
    (function main(global, module, isWorker, workerSize) {
      var canUseWorker = !!(
        global.Worker &&
        global.Blob &&
        global.Promise &&
        global.OffscreenCanvas &&
        global.OffscreenCanvasRenderingContext2D &&
        global.HTMLCanvasElement &&
        global.HTMLCanvasElement.prototype.transferControlToOffscreen &&
        global.URL &&
        global.URL.createObjectURL);

      function noop() {}

      // create a promise if it exists, otherwise, just
      // call the function directly
      function promise(func) {
        var ModulePromise = module.exports.Promise;
        var Prom = ModulePromise !== void 0 ? ModulePromise : global.Promise;

        if (typeof Prom === 'function') {
          return new Prom(func);
        }

        func(noop, noop);

        return null;
      }

      var raf = (function () {
        var TIME = Math.floor(1000 / 60);
        var frame, cancel;
        var frames = {};
        var lastFrameTime = 0;

        if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
          frame = function (cb) {
            var id = Math.random();

            frames[id] = requestAnimationFrame(function onFrame(time) {
              if (lastFrameTime === time || lastFrameTime + TIME - 1 < time) {
                lastFrameTime = time;
                delete frames[id];

                cb();
              } else {
                frames[id] = requestAnimationFrame(onFrame);
              }
            });

            return id;
          };
          cancel = function (id) {
            if (frames[id]) {
              cancelAnimationFrame(frames[id]);
            }
          };
        } else {
          frame = function (cb) {
            return setTimeout(cb, TIME);
          };
          cancel = function (timer) {
            return clearTimeout(timer);
          };
        }

        return { frame: frame, cancel: cancel };
      }());

      var getWorker = (function () {
        var worker;
        var prom;
        var resolves = {};

        function decorate(worker) {
          function execute(options, callback) {
            worker.postMessage({ options: options || {}, callback: callback });
          }
          worker.init = function initWorker(canvas) {
            var offscreen = canvas.transferControlToOffscreen();
            worker.postMessage({ canvas: offscreen }, [offscreen]);
          };

          worker.fire = function fireWorker(options, size, done) {
            if (prom) {
              execute(options, null);
              return prom;
            }

            var id = Math.random().toString(36).slice(2);

            prom = promise(function (resolve) {
              function workerDone(msg) {
                if (msg.data.callback !== id) {
                  return;
                }

                delete resolves[id];
                worker.removeEventListener('message', workerDone);

                prom = null;
                done();
                resolve();
              }

              worker.addEventListener('message', workerDone);
              execute(options, id);

              resolves[id] = workerDone.bind(null, { data: { callback: id }});
            });

            return prom;
          };

          worker.reset = function resetWorker() {
            worker.postMessage({ reset: true });

            for (var id in resolves) {
              resolves[id]();
              delete resolves[id];
            }
          };
        }

        return function () {
          if (worker) {
            return worker;
          }

          if (!isWorker && canUseWorker) {
            var code = [
              'var CONFETTI, SIZE = {}, module = {};',
              '(' + main.toString() + ')(this, module, true, SIZE);',
              'onmessage = function(msg) {',
              '  if (msg.data.options) {',
              '    CONFETTI(msg.data.options).then(function () {',
              '      if (msg.data.callback) {',
              '        postMessage({ callback: msg.data.callback });',
              '      }',
              '    });',
              '  } else if (msg.data.reset) {',
              '    CONFETTI.reset();',
              '  } else if (msg.data.resize) {',
              '    SIZE.width = msg.data.resize.width;',
              '    SIZE.height = msg.data.resize.height;',
              '  } else if (msg.data.canvas) {',
              '    SIZE.width = msg.data.canvas.width;',
              '    SIZE.height = msg.data.canvas.height;',
              '    CONFETTI = module.exports.create(msg.data.canvas);',
              '  }',
              '}',
            ].join('\n');
            try {
              worker = new Worker(URL.createObjectURL(new Blob([code])));
            } catch (e) {
              // eslint-disable-next-line no-console
              typeof console !== undefined && typeof console.warn === 'function' ? console.warn('🎊 Could not load worker', e) : null;

              return null;
            }

            decorate(worker);
          }

          return worker;
        };
      })();

      var defaults = {
        particleCount: 50,
        angle: 90,
        spread: 45,
        startVelocity: 45,
        decay: 0.9,
        gravity: 1,
        drift: 0,
        ticks: 200,
        x: 0.5,
        y: 0.5,
        shapes: ['square', 'circle'],
        zIndex: 100,
        colors: [
          '#26ccff',
          '#a25afd',
          '#ff5e7e',
          '#88ff5a',
          '#fcff42',
          '#ffa62d',
          '#ff36ff'
        ],
        // probably should be true, but back-compat
        disableForReducedMotion: false,
        scalar: 1
      };

      function convert(val, transform) {
        return transform ? transform(val) : val;
      }

      function isOk(val) {
        return !(val === null || val === undefined);
      }

      function prop(options, name, transform) {
        return convert(
          options && isOk(options[name]) ? options[name] : defaults[name],
          transform
        );
      }

      function onlyPositiveInt(number){
        return number < 0 ? 0 : Math.floor(number);
      }

      function randomInt(min, max) {
        // [min, max)
        return Math.floor(Math.random() * (max - min)) + min;
      }

      function toDecimal(str) {
        return parseInt(str, 16);
      }

      function colorsToRgb(colors) {
        return colors.map(hexToRgb);
      }

      function hexToRgb(str) {
        var val = String(str).replace(/[^0-9a-f]/gi, '');

        if (val.length < 6) {
            val = val[0]+val[0]+val[1]+val[1]+val[2]+val[2];
        }

        return {
          r: toDecimal(val.substring(0,2)),
          g: toDecimal(val.substring(2,4)),
          b: toDecimal(val.substring(4,6))
        };
      }

      function getOrigin(options) {
        var origin = prop(options, 'origin', Object);
        origin.x = prop(origin, 'x', Number);
        origin.y = prop(origin, 'y', Number);

        return origin;
      }

      function setCanvasWindowSize(canvas) {
        canvas.width = document.documentElement.clientWidth;
        canvas.height = document.documentElement.clientHeight;
      }

      function setCanvasRectSize(canvas) {
        var rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      function getCanvas(zIndex) {
        var canvas = document.createElement('canvas');

        canvas.style.position = 'fixed';
        canvas.style.top = '0px';
        canvas.style.left = '0px';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = zIndex;

        return canvas;
      }

      function ellipse(context, x, y, radiusX, radiusY, rotation, startAngle, endAngle, antiClockwise) {
        context.save();
        context.translate(x, y);
        context.rotate(rotation);
        context.scale(radiusX, radiusY);
        context.arc(0, 0, 1, startAngle, endAngle, antiClockwise);
        context.restore();
      }

      function randomPhysics(opts) {
        var radAngle = opts.angle * (Math.PI / 180);
        var radSpread = opts.spread * (Math.PI / 180);

        return {
          x: opts.x,
          y: opts.y,
          wobble: Math.random() * 10,
          velocity: (opts.startVelocity * 0.5) + (Math.random() * opts.startVelocity),
          angle2D: -radAngle + ((0.5 * radSpread) - (Math.random() * radSpread)),
          tiltAngle: Math.random() * Math.PI,
          color: opts.color,
          shape: opts.shape,
          tick: 0,
          totalTicks: opts.ticks,
          decay: opts.decay,
          drift: opts.drift,
          random: Math.random() + 5,
          tiltSin: 0,
          tiltCos: 0,
          wobbleX: 0,
          wobbleY: 0,
          gravity: opts.gravity * 3,
          ovalScalar: 0.6,
          scalar: opts.scalar
        };
      }

      function updateFetti(context, fetti) {
        fetti.x += Math.cos(fetti.angle2D) * fetti.velocity + fetti.drift;
        fetti.y += Math.sin(fetti.angle2D) * fetti.velocity + fetti.gravity;
        fetti.wobble += 0.1;
        fetti.velocity *= fetti.decay;
        fetti.tiltAngle += 0.1;
        fetti.tiltSin = Math.sin(fetti.tiltAngle);
        fetti.tiltCos = Math.cos(fetti.tiltAngle);
        fetti.random = Math.random() + 5;
        fetti.wobbleX = fetti.x + ((10 * fetti.scalar) * Math.cos(fetti.wobble));
        fetti.wobbleY = fetti.y + ((10 * fetti.scalar) * Math.sin(fetti.wobble));

        var progress = (fetti.tick++) / fetti.totalTicks;

        var x1 = fetti.x + (fetti.random * fetti.tiltCos);
        var y1 = fetti.y + (fetti.random * fetti.tiltSin);
        var x2 = fetti.wobbleX + (fetti.random * fetti.tiltCos);
        var y2 = fetti.wobbleY + (fetti.random * fetti.tiltSin);

        context.fillStyle = 'rgba(' + fetti.color.r + ', ' + fetti.color.g + ', ' + fetti.color.b + ', ' + (1 - progress) + ')';
        context.beginPath();

        if (fetti.shape === 'circle') {
          context.ellipse ?
            context.ellipse(fetti.x, fetti.y, Math.abs(x2 - x1) * fetti.ovalScalar, Math.abs(y2 - y1) * fetti.ovalScalar, Math.PI / 10 * fetti.wobble, 0, 2 * Math.PI) :
            ellipse(context, fetti.x, fetti.y, Math.abs(x2 - x1) * fetti.ovalScalar, Math.abs(y2 - y1) * fetti.ovalScalar, Math.PI / 10 * fetti.wobble, 0, 2 * Math.PI);
        } else {
          context.moveTo(Math.floor(fetti.x), Math.floor(fetti.y));
          context.lineTo(Math.floor(fetti.wobbleX), Math.floor(y1));
          context.lineTo(Math.floor(x2), Math.floor(y2));
          context.lineTo(Math.floor(x1), Math.floor(fetti.wobbleY));
        }

        context.closePath();
        context.fill();

        return fetti.tick < fetti.totalTicks;
      }

      function animate(canvas, fettis, resizer, size, done) {
        var animatingFettis = fettis.slice();
        var context = canvas.getContext('2d');
        var animationFrame;
        var destroy;

        var prom = promise(function (resolve) {
          function onDone() {
            animationFrame = destroy = null;

            context.clearRect(0, 0, size.width, size.height);

            done();
            resolve();
          }

          function update() {
            if (isWorker && !(size.width === workerSize.width && size.height === workerSize.height)) {
              size.width = canvas.width = workerSize.width;
              size.height = canvas.height = workerSize.height;
            }

            if (!size.width && !size.height) {
              resizer(canvas);
              size.width = canvas.width;
              size.height = canvas.height;
            }

            context.clearRect(0, 0, size.width, size.height);

            animatingFettis = animatingFettis.filter(function (fetti) {
              return updateFetti(context, fetti);
            });

            if (animatingFettis.length) {
              animationFrame = raf.frame(update);
            } else {
              onDone();
            }
          }

          animationFrame = raf.frame(update);
          destroy = onDone;
        });

        return {
          addFettis: function (fettis) {
            animatingFettis = animatingFettis.concat(fettis);

            return prom;
          },
          canvas: canvas,
          promise: prom,
          reset: function () {
            if (animationFrame) {
              raf.cancel(animationFrame);
            }

            if (destroy) {
              destroy();
            }
          }
        };
      }

      function confettiCannon(canvas, globalOpts) {
        var isLibCanvas = !canvas;
        var allowResize = !!prop(globalOpts || {}, 'resize');
        var globalDisableForReducedMotion = prop(globalOpts, 'disableForReducedMotion', Boolean);
        var shouldUseWorker = canUseWorker && !!prop(globalOpts || {}, 'useWorker');
        var worker = shouldUseWorker ? getWorker() : null;
        var resizer = isLibCanvas ? setCanvasWindowSize : setCanvasRectSize;
        var initialized = (canvas && worker) ? !!canvas.__confetti_initialized : false;
        var preferLessMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion)').matches;
        var animationObj;

        function fireLocal(options, size, done) {
          var particleCount = prop(options, 'particleCount', onlyPositiveInt);
          var angle = prop(options, 'angle', Number);
          var spread = prop(options, 'spread', Number);
          var startVelocity = prop(options, 'startVelocity', Number);
          var decay = prop(options, 'decay', Number);
          var gravity = prop(options, 'gravity', Number);
          var drift = prop(options, 'drift', Number);
          var colors = prop(options, 'colors', colorsToRgb);
          var ticks = prop(options, 'ticks', Number);
          var shapes = prop(options, 'shapes');
          var scalar = prop(options, 'scalar');
          var origin = getOrigin(options);

          var temp = particleCount;
          var fettis = [];

          var startX = canvas.width * origin.x;
          var startY = canvas.height * origin.y;

          while (temp--) {
            fettis.push(
              randomPhysics({
                x: startX,
                y: startY,
                angle: angle,
                spread: spread,
                startVelocity: startVelocity,
                color: colors[temp % colors.length],
                shape: shapes[randomInt(0, shapes.length)],
                ticks: ticks,
                decay: decay,
                gravity: gravity,
                drift: drift,
                scalar: scalar
              })
            );
          }

          // if we have a previous canvas already animating,
          // add to it
          if (animationObj) {
            return animationObj.addFettis(fettis);
          }

          animationObj = animate(canvas, fettis, resizer, size , done);

          return animationObj.promise;
        }

        function fire(options) {
          var disableForReducedMotion = globalDisableForReducedMotion || prop(options, 'disableForReducedMotion', Boolean);
          var zIndex = prop(options, 'zIndex', Number);

          if (disableForReducedMotion && preferLessMotion) {
            return promise(function (resolve) {
              resolve();
            });
          }

          if (isLibCanvas && animationObj) {
            // use existing canvas from in-progress animation
            canvas = animationObj.canvas;
          } else if (isLibCanvas && !canvas) {
            // create and initialize a new canvas
            canvas = getCanvas(zIndex);
            document.body.appendChild(canvas);
          }

          if (allowResize && !initialized) {
            // initialize the size of a user-supplied canvas
            resizer(canvas);
          }

          var size = {
            width: canvas.width,
            height: canvas.height
          };

          if (worker && !initialized) {
            worker.init(canvas);
          }

          initialized = true;

          if (worker) {
            canvas.__confetti_initialized = true;
          }

          function onResize() {
            if (worker) {
              // TODO this really shouldn't be immediate, because it is expensive
              var obj = {
                getBoundingClientRect: function () {
                  if (!isLibCanvas) {
                    return canvas.getBoundingClientRect();
                  }
                }
              };

              resizer(obj);

              worker.postMessage({
                resize: {
                  width: obj.width,
                  height: obj.height
                }
              });
              return;
            }

            // don't actually query the size here, since this
            // can execute frequently and rapidly
            size.width = size.height = null;
          }

          function done() {
            animationObj = null;

            if (allowResize) {
              global.removeEventListener('resize', onResize);
            }

            if (isLibCanvas && canvas) {
              document.body.removeChild(canvas);
              canvas = null;
              initialized = false;
            }
          }

          if (allowResize) {
            global.addEventListener('resize', onResize, false);
          }

          if (worker) {
            return worker.fire(options, size, done);
          }

          return fireLocal(options, size, done);
        }

        fire.reset = function () {
          if (worker) {
            worker.reset();
          }

          if (animationObj) {
            animationObj.reset();
          }
        };

        return fire;
      }

      module.exports = confettiCannon(null, { useWorker: true, resize: true });
      module.exports.create = confettiCannon;
    }((function () {
      if (typeof window !== 'undefined') {
        return window;
      }

      if (typeof self !== 'undefined') {
        return self;
      }

      return this || {};
    })(), module, false));

    // end source content

    var confetti = module.exports;
    module.exports.create;

    /* src/components/components/Countdown.svelte generated by Svelte v3.38.3 */
    const file$5 = "src/components/components/Countdown.svelte";

    function create_fragment$5(ctx) {
    	let div6;
    	let div0;
    	let p0;
    	let b;
    	let t1;
    	let t2;
    	let div5;
    	let div1;
    	let p1;
    	let t3;
    	let t4;
    	let p2;
    	let t6;
    	let div2;
    	let p3;
    	let t7;
    	let t8;
    	let p4;
    	let t10;
    	let div3;
    	let p5;
    	let t11;
    	let t12;
    	let p6;
    	let t14;
    	let div4;
    	let p7;
    	let t15;
    	let t16;
    	let p8;

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			b = element("b");
    			b.textContent = "Game-changing";
    			t1 = text(" production solution launching in:");
    			t2 = space();
    			div5 = element("div");
    			div1 = element("div");
    			p1 = element("p");
    			t3 = text(/*days*/ ctx[0]);
    			t4 = space();
    			p2 = element("p");
    			p2.textContent = "Days";
    			t6 = space();
    			div2 = element("div");
    			p3 = element("p");
    			t7 = text(/*hours*/ ctx[1]);
    			t8 = space();
    			p4 = element("p");
    			p4.textContent = "Hours";
    			t10 = space();
    			div3 = element("div");
    			p5 = element("p");
    			t11 = text(/*minutes*/ ctx[2]);
    			t12 = space();
    			p6 = element("p");
    			p6.textContent = "Minutes";
    			t14 = space();
    			div4 = element("div");
    			p7 = element("p");
    			t15 = text(/*seconds*/ ctx[3]);
    			t16 = space();
    			p8 = element("p");
    			p8.textContent = "Seconds";
    			add_location(b, file$5, 59, 11, 1796);
    			add_location(p0, file$5, 59, 8, 1793);
    			attr_dev(div0, "class", "mx-auto variable-font-size-header svelte-n3irku");
    			add_location(div0, file$5, 58, 4, 1737);
    			attr_dev(p1, "class", "p-3 xs:p-5 font-thin m-auto");
    			add_location(p1, file$5, 63, 12, 1988);
    			attr_dev(p2, "class", "m-auto variable-font-size-1_5 svelte-n3irku");
    			add_location(p2, file$5, 64, 12, 2050);
    			attr_dev(div1, "class", "flex flex-col w-3/12");
    			add_location(div1, file$5, 62, 8, 1941);
    			attr_dev(p3, "class", "p-3 xs:p-5 font-thin m-auto");
    			add_location(p3, file$5, 67, 12, 2170);
    			attr_dev(p4, "class", "m-auto variable-font-size-1_5 svelte-n3irku");
    			add_location(p4, file$5, 68, 12, 2233);
    			attr_dev(div2, "class", "flex flex-col w-3/12");
    			add_location(div2, file$5, 66, 8, 2123);
    			attr_dev(p5, "class", "p-3 xs:p-5 font-thin m-auto");
    			add_location(p5, file$5, 71, 12, 2354);
    			attr_dev(p6, "class", "m-auto variable-font-size-1_5 svelte-n3irku");
    			add_location(p6, file$5, 72, 12, 2419);
    			attr_dev(div3, "class", "flex flex-col w-3/12");
    			add_location(div3, file$5, 70, 8, 2307);
    			attr_dev(p7, "class", "p-3 xs:p-5 font-thin m-auto");
    			add_location(p7, file$5, 75, 12, 2542);
    			attr_dev(p8, "class", "m-auto variable-font-size-1_5 svelte-n3irku");
    			add_location(p8, file$5, 76, 12, 2607);
    			attr_dev(div4, "class", "flex flex-col w-3/12");
    			add_location(div4, file$5, 74, 8, 2495);
    			attr_dev(div5, "class", "flex flex-row w-5/6 mx-auto variable-font-size-5 svelte-n3irku");
    			add_location(div5, file$5, 61, 4, 1870);
    			attr_dev(div6, "class", "flex flex-col justify-center w-full h-3/6 select-none");
    			add_location(div6, file$5, 57, 0, 1665);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div0);
    			append_dev(div0, p0);
    			append_dev(p0, b);
    			append_dev(p0, t1);
    			append_dev(div6, t2);
    			append_dev(div6, div5);
    			append_dev(div5, div1);
    			append_dev(div1, p1);
    			append_dev(p1, t3);
    			append_dev(div1, t4);
    			append_dev(div1, p2);
    			append_dev(div5, t6);
    			append_dev(div5, div2);
    			append_dev(div2, p3);
    			append_dev(p3, t7);
    			append_dev(div2, t8);
    			append_dev(div2, p4);
    			append_dev(div5, t10);
    			append_dev(div5, div3);
    			append_dev(div3, p5);
    			append_dev(p5, t11);
    			append_dev(div3, t12);
    			append_dev(div3, p6);
    			append_dev(div5, t14);
    			append_dev(div5, div4);
    			append_dev(div4, p7);
    			append_dev(p7, t15);
    			append_dev(div4, t16);
    			append_dev(div4, p8);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*days*/ 1) set_data_dev(t3, /*days*/ ctx[0]);
    			if (dirty & /*hours*/ 2) set_data_dev(t7, /*hours*/ ctx[1]);
    			if (dirty & /*minutes*/ 4) set_data_dev(t11, /*minutes*/ ctx[2]);
    			if (dirty & /*seconds*/ 8) set_data_dev(t15, /*seconds*/ ctx[3]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Countdown", slots, []);
    	const launchDate = new Date("Oct 11, 2021 12:00:00");
    	const launchDateTS = launchDate.getTime();
    	let days, hours, minutes, seconds;
    	[days, hours, minutes, seconds] = computeTimeLeft();
    	let showCounter = true;

    	setInterval(
    		() => {
    			$$invalidate(0, [days, hours, minutes, seconds] = computeTimeLeft(), days, $$invalidate(1, hours), $$invalidate(2, minutes), $$invalidate(3, seconds));
    		},
    		1000
    	);

    	function computeTimeLeft() {
    		const doubleDigits = number => {
    			return number.toLocaleString("en-US", {
    				minimumIntegerDigits: 2,
    				useGrouping: false
    			});
    		};

    		const now = new Date().getTime();
    		const timeleft = launchDateTS - now;
    		const days = Math.floor(timeleft / (1000 * 60 * 60 * 24));
    		const hours = Math.floor(timeleft % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
    		const minutes = Math.floor(timeleft % (1000 * 60 * 60) / (1000 * 60));
    		const seconds = Math.floor(timeleft % (1000 * 60) / 1000);

    		let time = [
    			doubleDigits(days),
    			doubleDigits(hours),
    			doubleDigits(minutes),
    			doubleDigits(seconds)
    		];

    		if (timeleft <= 0) {
    			confetti({
    				particleCount: Math.random() * 800 + 200,
    				angle: Math.random() * 180,
    				spread: Math.random() * 270,
    				gravity: Math.random() * 0.5 + 0.5,
    				origin: {
    					x: Math.random() * 0.6 + 0.2,
    					y: Math.random() * 0.6 + 0.2
    				}
    			});
    		}

    		return time;
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Countdown> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		confetti,
    		launchDate,
    		launchDateTS,
    		days,
    		hours,
    		minutes,
    		seconds,
    		showCounter,
    		computeTimeLeft
    	});

    	$$self.$inject_state = $$props => {
    		if ("days" in $$props) $$invalidate(0, days = $$props.days);
    		if ("hours" in $$props) $$invalidate(1, hours = $$props.hours);
    		if ("minutes" in $$props) $$invalidate(2, minutes = $$props.minutes);
    		if ("seconds" in $$props) $$invalidate(3, seconds = $$props.seconds);
    		if ("showCounter" in $$props) showCounter = $$props.showCounter;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [days, hours, minutes, seconds];
    }

    class Countdown extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Countdown",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/components/GetUpdatesButton.svelte generated by Svelte v3.38.3 */

    const file$4 = "src/components/components/GetUpdatesButton.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			button.textContent = "Be the first to know";
    			attr_dev(button, "class", "\n        bg-transparent text-white font-semibold hover:text-gray-300\n        py-2 px-4\n        border border-white hover:border-gray-300 rounded\n    ");
    			add_location(button, file$4, 11, 4, 243);
    			attr_dev(div, "class", "mx-auto lg:mx-0 lg:left-0 mt-16 sm:mt-24 lg:mt-12");
    			add_location(div, file$4, 10, 0, 152);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*handleClick*/ ctx[0], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("GetUpdatesButton", slots, []);
    	let { modal } = $$props;

    	function handleClick() {
    		modal.container.classList.toggle("hidden");
    	}

    	const writable_props = ["modal"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<GetUpdatesButton> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("modal" in $$props) $$invalidate(1, modal = $$props.modal);
    	};

    	$$self.$capture_state = () => ({ modal, handleClick });

    	$$self.$inject_state = $$props => {
    		if ("modal" in $$props) $$invalidate(1, modal = $$props.modal);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [handleClick, modal];
    }

    class GetUpdatesButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { modal: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "GetUpdatesButton",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*modal*/ ctx[1] === undefined && !("modal" in props)) {
    			console.warn("<GetUpdatesButton> was created without expected prop 'modal'");
    		}
    	}

    	get modal() {
    		throw new Error("<GetUpdatesButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set modal(value) {
    		throw new Error("<GetUpdatesButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/InnerContent.svelte generated by Svelte v3.38.3 */
    const file$3 = "src/components/InnerContent.svelte";

    function create_fragment$3(ctx) {
    	let div6;
    	let div3;
    	let div1;
    	let div0;
    	let p0;
    	let t1;
    	let p1;
    	let t3;
    	let div2;
    	let p2;
    	let t4;
    	let b;
    	let t6;
    	let t7;
    	let p3;
    	let t9;
    	let getupdatesbutton;
    	let t10;
    	let div5;
    	let countdown;
    	let t11;
    	let div4;
    	let img;
    	let img_src_value;
    	let current;

    	getupdatesbutton = new GetUpdatesButton({
    			props: { modal: /*modal*/ ctx[0] },
    			$$inline: true
    		});

    	countdown = new Countdown({ $$inline: true });

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "October 2021";
    			t1 = space();
    			p1 = element("p");
    			p1.textContent = "7th";
    			t3 = space();
    			div2 = element("div");
    			p2 = element("p");
    			t4 = text("We are creating a better way to make ");
    			b = element("b");
    			b.textContent = "fashion & lifestyle";
    			t6 = text(" products.");
    			t7 = space();
    			p3 = element("p");
    			p3.textContent = "Be there when we reveal how cutting-edge technology enables a healthy planet and a healthy business without compromising the other.";
    			t9 = space();
    			create_component(getupdatesbutton.$$.fragment);
    			t10 = space();
    			div5 = element("div");
    			create_component(countdown.$$.fragment);
    			t11 = space();
    			div4 = element("div");
    			img = element("img");
    			attr_dev(p0, "class", "pl-2 variable-font-size-title svelte-10l2s2e");
    			add_location(p0, file$3, 37, 16, 812);
    			attr_dev(p1, "class", "variable-font-size-date svelte-10l2s2e");
    			set_style(p1, "line-height", "0.8");
    			add_location(p1, file$3, 38, 16, 886);
    			attr_dev(div0, "class", "m-auto");
    			add_location(div0, file$3, 36, 12, 775);
    			attr_dev(div1, "class", "flex w-full h-1/2");
    			add_location(div1, file$3, 34, 8, 705);
    			add_location(b, file$3, 49, 97, 1291);
    			attr_dev(p2, "class", "text-xl sm:text-2xl md:text-3xl mb-6");
    			add_location(p2, file$3, 49, 12, 1206);
    			attr_dev(p3, "class", "text-md sm:text-lg md:text-xl");
    			add_location(p3, file$3, 50, 12, 1344);
    			attr_dev(div2, "class", "flex flex-col lg:justify-center w-full\n        flex-grow lg:h-3/6\n        px-8 sm:px-16\n        mt-16 sm:mt-24 lg:mt-0\n        ");
    			add_location(div2, file$3, 43, 8, 1026);
    			attr_dev(div3, "class", "flex flex-col w-full lg:w-6/12 lg:h-full");
    			add_location(div3, file$3, 31, 4, 614);
    			attr_dev(img, "class", "mx-auto mt-16 sm:mt-24 lg:mt-0 w-5/6 xs:w-4/6 sm:w-3/6");
    			if (img.src !== (img_src_value = "./img/logo.svg")) attr_dev(img, "src", img_src_value);
    			add_location(img, file$3, 61, 12, 1829);
    			attr_dev(div4, "class", "flex flex-col justify-end w-full lg:h-3/6 px-16 pb-16");
    			add_location(div4, file$3, 60, 8, 1749);
    			attr_dev(div5, "class", "flex flex-col w-full lg:w-6/12 lg:h-full mt-16 sm:mt-24 lg:mt-0");
    			add_location(div5, file$3, 56, 4, 1618);
    			attr_dev(div6, "class", "flex flex-col lg:flex-row w-full h-full min-h-full");
    			add_location(div6, file$3, 28, 0, 503);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div3);
    			append_dev(div3, div1);
    			append_dev(div1, div0);
    			append_dev(div0, p0);
    			append_dev(div0, t1);
    			append_dev(div0, p1);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, p2);
    			append_dev(p2, t4);
    			append_dev(p2, b);
    			append_dev(p2, t6);
    			append_dev(div2, t7);
    			append_dev(div2, p3);
    			append_dev(div2, t9);
    			mount_component(getupdatesbutton, div2, null);
    			append_dev(div6, t10);
    			append_dev(div6, div5);
    			mount_component(countdown, div5, null);
    			append_dev(div5, t11);
    			append_dev(div5, div4);
    			append_dev(div4, img);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const getupdatesbutton_changes = {};
    			if (dirty & /*modal*/ 1) getupdatesbutton_changes.modal = /*modal*/ ctx[0];
    			getupdatesbutton.$set(getupdatesbutton_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(getupdatesbutton.$$.fragment, local);
    			transition_in(countdown.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(getupdatesbutton.$$.fragment, local);
    			transition_out(countdown.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			destroy_component(getupdatesbutton);
    			destroy_component(countdown);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("InnerContent", slots, []);
    	let { modal } = $$props;
    	const writable_props = ["modal"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<InnerContent> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("modal" in $$props) $$invalidate(0, modal = $$props.modal);
    	};

    	$$self.$capture_state = () => ({ Countdown, GetUpdatesButton, modal });

    	$$self.$inject_state = $$props => {
    		if ("modal" in $$props) $$invalidate(0, modal = $$props.modal);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [modal];
    }

    class InnerContent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { modal: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InnerContent",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*modal*/ ctx[0] === undefined && !("modal" in props)) {
    			console.warn("<InnerContent> was created without expected prop 'modal'");
    		}
    	}

    	get modal() {
    		throw new Error("<InnerContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set modal(value) {
    		throw new Error("<InnerContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/CopyrightStatement.svelte generated by Svelte v3.38.3 */

    const file$2 = "src/components/CopyrightStatement.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let p;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			p.textContent = "2021 Rodinia ApS All rights reserved";
    			attr_dev(p, "class", "text-right text-xs xs:text-sm");
    			add_location(p, file$2, 6, 4, 182);
    			attr_dev(div, "class", "\nh-full transform rotate-180 order-3 sm:order-3\nborder border-white border-l-0 border-t-0 border-b-0\n");
    			set_style(div, "writing-mode", "vertical-rl");
    			set_style(div, "text-orientation", "mixed");
    			add_location(div, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CopyrightStatement", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CopyrightStatement> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class CopyrightStatement extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CopyrightStatement",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/Modal.svelte generated by Svelte v3.38.3 */

    const file$1 = "src/components/Modal.svelte";

    function create_fragment$1(ctx) {
    	let div2;
    	let div1;
    	let form_1;
    	let div0;
    	let h1;
    	let t1;
    	let input0;
    	let t2;
    	let input1;
    	let t3;
    	let input2;
    	let t4;
    	let button;
    	let t5;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			form_1 = element("form");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Be the first to know";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			input2 = element("input");
    			t4 = space();
    			button = element("button");
    			t5 = text("Submit");
    			attr_dev(h1, "class", "mb-8 text-2xl text-center");
    			add_location(h1, file$1, 70, 16, 2002);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "block border border-grey-light w-full p-2 rounded mb-2");
    			attr_dev(input0, "name", "fullname");
    			attr_dev(input0, "placeholder", "Name");
    			add_location(input0, file$1, 71, 16, 2082);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "block border border-grey-light w-full p-2 rounded mb-2");
    			attr_dev(input1, "name", "companyAndTitle");
    			attr_dev(input1, "placeholder", "Company and title");
    			add_location(input1, file$1, 78, 16, 2335);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "class", "block border border-grey-light w-full p-2 rounded mb-2");
    			attr_dev(input2, "name", "email");
    			attr_dev(input2, "placeholder", "Corporate email");
    			add_location(input2, file$1, 85, 16, 2615);
    			attr_dev(button, "type", "submit");

    			attr_dev(button, "class", button_class_value = `
                w-full text-center py-2 rounded text-white focus:outline-none my-1
                ${/*inputInvalid*/ ctx[5]
			? "bg-gray-300 cursor-default"
			: "bg-rg-milky-blue-light hover:bg-rg-milky-blue cursor-pointer"}`);

    			button.disabled = /*inputInvalid*/ ctx[5];
    			add_location(button, file$1, 92, 16, 2873);
    			attr_dev(div0, "class", "bg-white px-8 py-8 rounded shadow-md text-black w-full");
    			add_location(div0, file$1, 69, 12, 1917);
    			attr_dev(form_1, "action", "https://formspree.io/f/xzbyadvb");
    			attr_dev(form_1, "method", "POST");
    			add_location(form_1, file$1, 68, 8, 1843);
    			attr_dev(div1, "id", "modal-container");
    			attr_dev(div1, "class", "\n    flex flex-col m-auto\n    w-80 max-w-sm mx-auto\n    py-4 md:py-0 pl-0 md:pl-8\n    flex-grow justify-center\n    ");
    			add_location(div1, file$1, 61, 4, 1663);
    			attr_dev(div2, "id", "modal-background");
    			attr_dev(div2, "class", "\nflex flex-col justify-center fixed w-full h-full z-20 bg-black bg-opacity-40\nhidden\n");
    			add_location(div2, file$1, 52, 0, 1491);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, form_1);
    			append_dev(form_1, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*fullname*/ ctx[2]);
    			append_dev(div0, t2);
    			append_dev(div0, input1);
    			set_input_value(input1, /*companyAndTitle*/ ctx[3]);
    			append_dev(div0, t3);
    			append_dev(div0, input2);
    			set_input_value(input2, /*email*/ ctx[4]);
    			append_dev(div0, t4);
    			append_dev(div0, button);
    			append_dev(button, t5);
    			/*div1_binding*/ ctx[13](div1);
    			/*div2_binding*/ ctx[14](div2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "keydown", /*handleKeydown*/ ctx[8], false, false, false),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[10]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[11]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[12]),
    					listen_dev(button, "click", /*handleSubmitClick*/ ctx[7], false, false, false),
    					listen_dev(div2, "click", /*handleClick*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*fullname*/ 4 && input0.value !== /*fullname*/ ctx[2]) {
    				set_input_value(input0, /*fullname*/ ctx[2]);
    			}

    			if (dirty & /*companyAndTitle*/ 8 && input1.value !== /*companyAndTitle*/ ctx[3]) {
    				set_input_value(input1, /*companyAndTitle*/ ctx[3]);
    			}

    			if (dirty & /*email*/ 16 && input2.value !== /*email*/ ctx[4]) {
    				set_input_value(input2, /*email*/ ctx[4]);
    			}

    			if (dirty & /*inputInvalid*/ 32 && button_class_value !== (button_class_value = `
                w-full text-center py-2 rounded text-white focus:outline-none my-1
                ${/*inputInvalid*/ ctx[5]
			? "bg-gray-300 cursor-default"
			: "bg-rg-milky-blue-light hover:bg-rg-milky-blue cursor-pointer"}`)) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (dirty & /*inputInvalid*/ 32) {
    				prop_dev(button, "disabled", /*inputInvalid*/ ctx[5]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			/*div1_binding*/ ctx[13](null);
    			/*div2_binding*/ ctx[14](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function validateName(name) {
    	return [...name.matchAll(/\w+/g)].length > 1;
    }

    function validateEmail(email) {
    	const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    	return re.test(String(email).toLowerCase());
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Modal", slots, []);
    	let { modal } = $$props;
    	let container, form;
    	let fullname, companyAndTitle, email;
    	let inputInvalid = true;

    	function handleClick(event) {
    		if (event.srcElement.id == "modal-background" || event.srcElement.id == "modal-container") modal.container.classList.toggle("hidden");
    	}

    	function handleSubmitClick() {
    		modal.container.classList.toggle("hidden");
    	}

    	function handleKeydown(event) {
    		if (event.key == "Escape") {
    			if (!modal.container.classList.contains("hidden")) modal.container.classList.toggle("hidden");
    		}
    	}

    	const writable_props = ["modal"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		fullname = this.value;
    		$$invalidate(2, fullname);
    	}

    	function input1_input_handler() {
    		companyAndTitle = this.value;
    		$$invalidate(3, companyAndTitle);
    	}

    	function input2_input_handler() {
    		email = this.value;
    		$$invalidate(4, email);
    	}

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			form = $$value;
    			$$invalidate(1, form);
    		});
    	}

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			container = $$value;
    			$$invalidate(0, container);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("modal" in $$props) $$invalidate(9, modal = $$props.modal);
    	};

    	$$self.$capture_state = () => ({
    		modal,
    		container,
    		form,
    		fullname,
    		companyAndTitle,
    		email,
    		inputInvalid,
    		validateName,
    		validateEmail,
    		handleClick,
    		handleSubmitClick,
    		handleKeydown
    	});

    	$$self.$inject_state = $$props => {
    		if ("modal" in $$props) $$invalidate(9, modal = $$props.modal);
    		if ("container" in $$props) $$invalidate(0, container = $$props.container);
    		if ("form" in $$props) $$invalidate(1, form = $$props.form);
    		if ("fullname" in $$props) $$invalidate(2, fullname = $$props.fullname);
    		if ("companyAndTitle" in $$props) $$invalidate(3, companyAndTitle = $$props.companyAndTitle);
    		if ("email" in $$props) $$invalidate(4, email = $$props.email);
    		if ("inputInvalid" in $$props) $$invalidate(5, inputInvalid = $$props.inputInvalid);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*container, form*/ 3) {
    			{
    				$$invalidate(9, modal = { container, form });
    			}
    		}

    		if ($$self.$$.dirty & /*fullname, companyAndTitle, email*/ 28) {
    			{
    				if (fullname && companyAndTitle && email) {
    					let emailValid = validateEmail(email);
    					let companyAndTitleValid = validateName(companyAndTitle);
    					let nameValid = validateName(fullname);
    					$$invalidate(5, inputInvalid = !(emailValid && companyAndTitleValid && nameValid));
    				} else $$invalidate(5, inputInvalid = true);
    			}
    		}
    	};

    	return [
    		container,
    		form,
    		fullname,
    		companyAndTitle,
    		email,
    		inputInvalid,
    		handleClick,
    		handleSubmitClick,
    		handleKeydown,
    		modal,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		div1_binding,
    		div2_binding
    	];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { modal: 9 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*modal*/ ctx[9] === undefined && !("modal" in props)) {
    			console.warn("<Modal> was created without expected prop 'modal'");
    		}
    	}

    	get modal() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set modal(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.38.3 */
    const file = "src/App.svelte";

    // (28:6) {#if modal}
    function create_if_block(ctx) {
    	let div0;
    	let socialmedialinks;
    	let t0;
    	let div1;
    	let innercontent;
    	let t1;
    	let div2;
    	let copyrightstatement;
    	let current;
    	socialmedialinks = new SocialMediaLinks({ $$inline: true });

    	innercontent = new InnerContent({
    			props: { modal: /*modal*/ ctx[0] },
    			$$inline: true
    		});

    	copyrightstatement = new CopyrightStatement({ $$inline: true });

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			create_component(socialmedialinks.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			create_component(innercontent.$$.fragment);
    			t1 = space();
    			div2 = element("div");
    			create_component(copyrightstatement.$$.fragment);
    			attr_dev(div0, "class", "fixed h-full left-0 w-8 xs:w-16 lg:w-20 py-8");
    			add_location(div0, file, 28, 8, 735);
    			attr_dev(div1, "class", "w-full h-full mx-8 xs:mx-16 lg:mx-20 py-8");
    			add_location(div1, file, 32, 8, 851);
    			attr_dev(div2, "class", "fixed h-full right-0 w-8 xs:w-16 lg:w-20 py-8 px-1");
    			add_location(div2, file, 36, 8, 967);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			mount_component(socialmedialinks, div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(innercontent, div1, null);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);
    			mount_component(copyrightstatement, div2, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const innercontent_changes = {};
    			if (dirty & /*modal*/ 1) innercontent_changes.modal = /*modal*/ ctx[0];
    			innercontent.$set(innercontent_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(socialmedialinks.$$.fragment, local);
    			transition_in(innercontent.$$.fragment, local);
    			transition_in(copyrightstatement.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(socialmedialinks.$$.fragment, local);
    			transition_out(innercontent.$$.fragment, local);
    			transition_out(copyrightstatement.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_component(socialmedialinks);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			destroy_component(innercontent);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
    			destroy_component(copyrightstatement);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(28:6) {#if modal}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let tailwind;
    	let t0;
    	let div1;
    	let modal_1;
    	let updating_modal;
    	let t1;
    	let backgroundvideo;
    	let t2;
    	let div0;
    	let current;
    	tailwind = new Tailwind({ $$inline: true });

    	function modal_1_modal_binding(value) {
    		/*modal_1_modal_binding*/ ctx[1](value);
    	}

    	let modal_1_props = {};

    	if (/*modal*/ ctx[0] !== void 0) {
    		modal_1_props.modal = /*modal*/ ctx[0];
    	}

    	modal_1 = new Modal({ props: modal_1_props, $$inline: true });
    	binding_callbacks.push(() => bind(modal_1, "modal", modal_1_modal_binding));
    	backgroundvideo = new BackgroundVideo({ $$inline: true });
    	let if_block = /*modal*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			create_component(tailwind.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			create_component(modal_1.$$.fragment);
    			t1 = space();
    			create_component(backgroundvideo.$$.fragment);
    			t2 = space();
    			div0 = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "absolute flex flex-row h-screen w-screen text-white z-10");
    			add_location(div0, file, 26, 2, 638);
    			attr_dev(div1, "class", "w-full h-full");
    			add_location(div1, file, 19, 0, 522);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tailwind, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(modal_1, div1, null);
    			append_dev(div1, t1);
    			mount_component(backgroundvideo, div1, null);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			if (if_block) if_block.m(div0, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const modal_1_changes = {};

    			if (!updating_modal && dirty & /*modal*/ 1) {
    				updating_modal = true;
    				modal_1_changes.modal = /*modal*/ ctx[0];
    				add_flush_callback(() => updating_modal = false);
    			}

    			modal_1.$set(modal_1_changes);

    			if (/*modal*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*modal*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tailwind.$$.fragment, local);
    			transition_in(modal_1.$$.fragment, local);
    			transition_in(backgroundvideo.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tailwind.$$.fragment, local);
    			transition_out(modal_1.$$.fragment, local);
    			transition_out(backgroundvideo.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tailwind, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			destroy_component(modal_1);
    			destroy_component(backgroundvideo);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let modal;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function modal_1_modal_binding(value) {
    		modal = value;
    		$$invalidate(0, modal);
    	}

    	$$self.$capture_state = () => ({
    		Tailwind,
    		BackgroundVideo,
    		SocialMediaLinks,
    		InnerContent,
    		CopyrightStatement,
    		Modal,
    		modal
    	});

    	$$self.$inject_state = $$props => {
    		if ("modal" in $$props) $$invalidate(0, modal = $$props.modal);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [modal, modal_1_modal_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
