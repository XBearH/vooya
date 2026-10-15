// The component contract and implementation are ordinary Rust.
#[vooya::props]
#[derive(vooya::FromJs)]
pub struct LoopEventsProps {}

#[vooya::events]
pub trait LoopEventsEvents {
    fn choose(index: i32);
}

use wasm_bindgen::JsValue;

use crate::{EventListener, View, ViewElement};

pub struct Component {
    root: ViewElement,
    _clicks: Vec<EventListener>,
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
        .attribute("data-vooya-island", "loop-events")?;
    let label = view.element("p")?.text("Choose a loop-created listener:");
    root.append(&label)?;
    let mut clicks = Vec::new();

    for index in 1..=5_i32 {
        let button = view
            .element("button")?
            .attribute("aria-label", &format!("Choose {index}"))?
            .text(&index.to_string());
        let events = context.events.clone();
        let click = button.on("click", move |_event| {
            let _ = events.choose(index);
        })?;
        root.append(&button)?;
        clicks.push(click);
    }

    root.mount(&context.host)?;
    Ok(Component {
        root,
        _clicks: clicks,
    })
}

#[derive(Clone)]
struct MountEvents {
    target: web_sys::Element,
}

impl MountEvents {
    fn choose(&self, index: i32) -> Result<(), wasm_bindgen::JsValue> {
        let init = web_sys::CustomEventInit::new();
        init.set_bubbles(false);
        init.set_detail(&vooya::ToJs::to_js(&index)?);
        let event = web_sys::CustomEvent::new_with_event_init_dict("vooya-choose", &init)?;
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
pub fn LoopEvents(
    view: &vooya::View,
    _props: LoopEventsProps,
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
