// 新建 Vue 实例
class Vue {
  constructor(data_instance) {
    this.$data = data_instance.data;
    Observe(this.$data);
    Compile(data_instance.el, this);
  }
}

// 对象属性监听
function Observe(data_instance) {
  if (!data_instance || typeof data_instance !== "object") return;
  const dependency = new Dependency();
  Object.keys(data_instance).forEach((key) => {
    let _value = data_instance[key];
    Observe(_value);
    Object.defineProperty(data_instance, key, {
      enumerable: true,
      configurable: true,
      get() {
        Dependency.temp && dependency.addSubscriber(Dependency.temp);
        return _value;
      },
      set(newValue) {
        _value = newValue;
        Observe(_value);
        dependency.notify();
      },
    });
  });
}

// 模板编译
function Compile(el, vm) {
  vm.$el = document.querySelector(el);
  // 使用 fragment 暂存节点
  const fragment = document.createDocumentFragment();
  let child;
  // 将真实的节点添加到 fragment 中
  while ((child = vm.$el.firstChild)) {
    fragment.append(child);
  }
  // 替换真实节点上的插槽内容
  fragmentCompile(fragment);
  // 将替换后的节点添加到真实节点上
  vm.$el.appendChild(fragment);

  function fragmentCompile(fragment) {
    // 只处理文本节点
    if (fragment.nodeType === 3) {
      const pattern = /\{\{\s*(\S+)\s*\}\}/;
      // 保存原始表达式
      const rawNode = fragment.nodeValue;
      const result = pattern.exec(rawNode);
      if (result) {
        // 使用 reduce 深层访问数据
        const value = result[1]
          .split(".")
          .reduce((pre, cur) => pre[cur], vm.$data);
        // 替换插槽内容
        fragment.nodeValue = rawNode.replace(pattern, value);
        // 创建订阅者
        new Watcher(vm, result[1], (newValue) => {
          fragment.nodeValue = rawNode.replace(pattern, newValue);
        });
      }
    }
    if (fragment.nodeType === 1 && fragment.nodeName === "INPUT") {
      const attrs = Array.from(fragment.attributes);
      attrs.forEach((attr) => {
        if (attr.nodeName === "v-model") {
          fragment.value = attr.nodeValue
            .split(".")
            .reduce((pre, cur) => pre[cur], vm.$data);
          new Watcher(vm, attr.nodeValue, (newValue) => {
            fragment.value = newValue;
          });
          fragment.addEventListener("input", (e) => {
            const arr1 = attr.nodeValue.split(".");
            const arr2 = arr1.slice(0, arr1.length - 1);
            const final = arr2.reduce((pre, cur) => pre[cur], vm.$data);
            final[arr1[arr1.length - 1]] = e.target.value;
          });
        }
      });
    }
    fragment.childNodes.forEach((child) => fragmentCompile(child));
  }
}

// 添加订阅及发布
class Dependency {
  constructor() {
    this.subscribers = [];
  }
  addSubscriber(subscriber) {
    this.subscribers.push(subscriber);
  }
  notify() {
    this.subscribers.forEach((subscriber) => subscriber.update());
  }
}

// 订阅者
class Watcher {
  constructor(vm, key, callback) {
    this.vm = vm;
    this.key = key;
    this.callback = callback;
    Dependency.temp = this;
    key.split(".").reduce((pre, cur) => pre[cur], vm.$data);
    Dependency.temp = null;
  }
  update() {
    const value = this.key
      .split(".")
      .reduce((pre, cur) => pre[cur], this.vm.$data);
    this.callback(value);
  }
}
