import { Component, PureComponent } from "react";

/* 
废弃的三个生命周期函数用getDerivedStateFromProps替代，目前使用的话加上UNSAFE_：
- componentWillMount
- componentWillReceiveProps
- componentWillUpdate
 */

export default class LifeCycle extends Component {
  constructor(props) {
    super(props)
    console.log('父组件 constructor')
    this.seCount = this.seCount.bind(this)
    this.state = {
      count: 0
    }
  }
  seCount() {
    this.setState({
      count: this.state.count + 1
    })
  }
  // unsafe 废弃
  // componentWillMount() {
  //   console.log('挂在前 - componentWillMount')
  // }
  static getDerivedStateFromProps(test, initParam) {
    console.log('父组件节点？', test, initParam)
    return {
      count: initParam.count
    }
  }
  componentDidMount() {
    console.log('父组件挂载结束 - componentDidMount')
  }
  // unsafe 废弃
  // componentWillReceiveProps() {
  //   console.log('update - componentWillReceiveProps')
  // }
  /**
   * 判断数据是否修改了，修改后才触发更新时间
   * render发生 前
   */
  shouldComponentUpdate(nextProps, nextState) {
    const {count} = nextState
    console.log('父组件update - shouldComponentUpdate', count)
    return count !== 0
  }
  /**
   * 判断数据是否修改了，修改后才触发更新时间
   * render发生 后
   */
  getSnapshotBeforeUpdate(prevProps, prevState, snapshot) {
    const {count} = prevState
    console.log('父组件pdate - getSnapshotBeforeUpdate', count)
    // return {pos: {x: 100, y: 101}};
    return null
  }
  // unsafe 废弃
  // componentWillUpdate() {
  //   console.log('update - componentWillUpdate')
  // }
  componentDidUpdate() {
    console.log('父组件update - componentDidUpdate')
  }
  componentWillUnmount() {
    console.log('Unmounting - componentWillUnmount')
  }
  render() {
    console.log('父组件render 开始渲染')
    const {count} = this.state
    return (
      <div>
        <h2>{count}</h2>
        <Child count={count}/>
        <button onClick={this.seCount}>add</button>
      </div>
    )
  }
}

class Child extends PureComponent {
  componentDidMount() {
    console.log('子组件 - componentDidMount')
  }
  componentWillUnmount() {
    //组件卸载之前
    console.log("子组件 Child componentWillUnmount");
  }
  render() {
    console.log('子组件的render', this._reactInternals)
    return (
      <div>Child 子组件 {this.props.count}</div>
    )
  }
}