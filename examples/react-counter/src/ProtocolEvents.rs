// The component contract and implementation are ordinary Rust.
#[vooya::props]
#[derive(vooya::FromJs)]
pub struct ProtocolEventsProps {}

#[vooya::events]
pub trait ProtocolEventsEvents {
    fn zero();
    fn one(value: i32);
    fn many(index: i32, enabled: bool, label: String);
}

use wasm_bindgen::JsValue;

use crate::{EventListener, View, ViewElement};

pub struct Component {
    root: ViewElement,
    _listeners: Vec<EventListener>,
}

impl Component {
    pub fn dispose(&mut self) {
        self.root.remove();
    }
}

fn mount(context: MountContext) -> Result<Component, JsValue> {
    let view = View::from_host(&context.host)?;
    let root = view
        .element("section")?
        .attribute("data-vooya-island", "protocol-events")?;
    let mut listeners = Vec::new();
    for (label, emit) in [("Emit zero", 0), ("Emit one", 1), ("Emit many", 2)] {
        let button = view
            .element("button")?
            .attribute("aria-label", label)?
            .text(label);
        let events = context.events.clone();
        listeners.push(button.on("click", move |_event| {
            let _ = match emit {
                0 => events.zero(),
                1 => events.one(7),
                _ => events.many(3, true, "three".to_owned()),
            };
        })?);
        root.append(&button)?;
    }
    root.mount(&context.host)?;
    Ok(Component {
        root,
        _listeners: listeners,
    })
}

#[derive(Clone)]
struct MountEvents {
    target: web_sys::Element,
}

impl MountEvents {
    fn zero(&self) -> Result<(), wasm_bindgen::JsValue> {
        let init = web_sys::CustomEventInit::new();
        init.set_bubbles(false);
        init.set_detail(&wasm_bindgen::JsValue::UNDEFINED);
        let event = web_sys::CustomEvent::new_with_event_init_dict("vooya-zero", &init)?;
        self.target
            .parent_element()
            .unwrap_or_else(|| self.target.clone())
            .dispatch_event(&event)
            .map(|_| ())
    }
    fn one(&self, value: i32) -> Result<(), wasm_bindgen::JsValue> {
        let init = web_sys::CustomEventInit::new();
        init.set_bubbles(false);
        init.set_detail(&vooya::ToJs::to_js(&value)?);
        let event = web_sys::CustomEvent::new_with_event_init_dict("vooya-one", &init)?;
        self.target
            .parent_element()
            .unwrap_or_else(|| self.target.clone())
            .dispatch_event(&event)
            .map(|_| ())
    }
    fn many(&self, index: i32, enabled: bool, label: String) -> Result<(), wasm_bindgen::JsValue> {
        let init = web_sys::CustomEventInit::new();
        init.set_bubbles(false);
        init.set_detail(&{
            let args = js_sys::Array::new();
            args.push(&vooya::ToJs::to_js(&index)?);
            args.push(&vooya::ToJs::to_js(&enabled)?);
            args.push(&vooya::ToJs::to_js(&label)?);
            args.into()
        });
        let event = web_sys::CustomEvent::new_with_event_init_dict("vooya-many", &init)?;
        self.target
            .parent_element()
            .unwrap_or_else(|| self.target.clone())
            .dispatch_event(&event)
            .map(|_| ())
    }
}

struct MountContext {
    host: web_sys::Element,
    events: MountEvents,
}

thread_local! {
    static MOUNTED: std::cell::RefCell<Vec<Option<Component>>> = const { std::cell::RefCell::new(Vec::new()) };
}

#[vooya::component]
pub fn ProtocolEvents(
    view: &vooya::View,
    _props: ProtocolEventsProps,
) -> Result<vooya::ViewElement, wasm_bindgen::JsValue> {
    let root = view
        .element("div")?
        .attribute("style", "display: contents")?;
    let cleanup = vooya::MountCleanup::default();
    let context = MountContext {
        host: root.as_element().clone(),
        events: MountEvents {
            target: root.as_element().clone(),
        },
    };
    let component = match mount(context) {
        Ok(component) => component,
        Err(cause) => {
            cleanup.run();
            root.remove();
            return Err(cause);
        }
    };
    cleanup.disarm();
    let handle = MOUNTED.with(|mounted| {
        let mut mounted = mounted.borrow_mut();
        if let Some(handle) = mounted.iter().position(Option::is_none) {
            mounted[handle] = Some(component);
            handle
        } else {
            mounted.push(Some(component));
            mounted.len() - 1
        }
    });
    root.as_element()
        .set_attribute("data-example-handle", &handle.to_string())?;
    root.defer_cleanup(move || {
        let component =
            MOUNTED.with(|mounted| mounted.borrow_mut().get_mut(handle).and_then(Option::take));
        if let Some(mut component) = component {
            component.dispose();
        }
    });
    Ok(root)
}
