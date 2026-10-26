// The component contract and implementation are ordinary Rust.
#[vooya::props]
#[derive(vooya::FromJs)]
pub struct FailMountProps {}

#[vooya::events]
pub trait FailMountEvents {
    fn ping();
}

use wasm_bindgen::JsValue;

pub struct Component;

impl Component {
    pub fn dispose(&mut self) {}
}

fn mount(context: MountContext) -> Result<Component, JsValue> {
    let document = context
        .host
        .owner_document()
        .ok_or_else(|| JsValue::from_str("missing document"))?;
    let node = document.create_element("p")?;
    node.set_text_content(Some("mount residue"));
    context.host.append_child(&node)?;
    let cleanup_node = node.clone();
    context.cleanup.defer(move || cleanup_node.remove());
    Err(JsValue::from_str("fixture mount failure"))
}

struct MountContext {
    host: web_sys::Element,
    cleanup: vooya::MountCleanup,
}

thread_local! {
    static MOUNTED: std::cell::RefCell<Vec<Option<Component>>> = const { std::cell::RefCell::new(Vec::new()) };
}

#[vooya::component]
pub fn FailMount(
    view: &vooya::View,
    _props: FailMountProps,
) -> Result<vooya::ViewElement, wasm_bindgen::JsValue> {
    let root = view
        .element("div")?
        .attribute("style", "display: contents")?;
    let cleanup = vooya::MountCleanup::default();
    let context = MountContext {
        host: root.as_element().clone(),
        cleanup: cleanup.clone(),
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
