// The component contract and implementation are ordinary Rust.
#[vooya::props]
#[derive(vooya::FromJs)]
pub struct CounterProps {
    pub initial: Option<i32>,
}

use crate::{View, ViewElement};
use wasm_bindgen::JsValue;
pub struct Component {
    root: ViewElement,
    output: ViewElement,
}
impl Component {
    pub fn update_initial(&self, value: i32) {
        self.output.set_text(&value.to_string());
    }
    pub fn dispose(&mut self) {
        self.root.remove();
    }
}
fn mount(context: MountContext) -> Result<Component, JsValue> {
    let view = View::from_host(&context.host)?;
    let root = view.element("section")?.class("counter");
    let output = view.element("output")?.attribute("data-count", "")?;
    output.set_text(&context.props.initial.to_string());
    root.append(&output)?;
    root.mount(&context.host)?;
    Ok(Component { root, output })
}

struct MountProps {
    initial: i32,
}

struct MountContext {
    host: web_sys::Element,
    props: MountProps,
}

thread_local! {
    static MOUNTED: std::cell::RefCell<Vec<Option<Component>>> = const { std::cell::RefCell::new(Vec::new()) };
}

#[vooya::component(update = "update_counter")]
#[vooya::style("./Counter.css", scoped)]
pub fn Counter(
    view: &vooya::View,
    props: CounterProps,
) -> Result<vooya::ViewElement, wasm_bindgen::JsValue> {
    let root = view
        .element("div")?
        .attribute("style", "display: contents")?;
    let cleanup = vooya::MountCleanup::default();
    let context = MountContext {
        host: root.as_element().clone(),
        props: MountProps {
            initial: props.initial.unwrap_or(1),
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

fn update_counter(
    root: &vooya::ViewElement,
    props: CounterProps,
) -> Result<(), wasm_bindgen::JsValue> {
    let handle = root
        .as_element()
        .get_attribute("data-example-handle")
        .and_then(|value| value.parse::<usize>().ok())
        .ok_or_else(|| wasm_bindgen::JsValue::from_str("missing example instance"))?;
    MOUNTED.with(|mounted| {
        let mounted = mounted.borrow();
        let component = mounted
            .get(handle)
            .and_then(Option::as_ref)
            .ok_or_else(|| wasm_bindgen::JsValue::from_str("disposed example instance"))?;
        component.update_initial(props.initial.unwrap_or(1));
        Ok(())
    })
}
