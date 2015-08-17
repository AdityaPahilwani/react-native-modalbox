'use strict';

var React = require('react-native');
var {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  TouchableWithoutFeedback
} = React;

var Overlay         = require('react-native-overlay');
var screen          = require('Dimensions').get('window');

var styles = StyleSheet.create({

  wrapper: {
    backgroundColor: "white",
    position: "absolute",
    height: screen.height,
    width: screen.width
  },

  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    height: screen.height,
    width: screen.width
  }

});

var Modal = React.createClass({

  propTypes: {
    swipeToClose: React.PropTypes.bool,
    swipeThreshold: React.PropTypes.number,
    onClosed: React.PropTypes.func,
    onOpened: React.PropTypes.func,
    onClosingState: React.PropTypes.func,
    position: React.PropTypes.string,
    backdrop: React.PropTypes.bool,
    backdropOpacity: React.PropTypes.number,
    backdropColor: React.PropTypes.string,
    backdropContent: React.PropTypes.element
  },

  getDefaultProps: function () {
    return {
      isOpen: false,
      swipeToClose: true,
      swipeThreshold: 50,
      aboveStatusBar: true,
      position: "center",
      backdrop: true,
      backdropOpacity: 0.5,
      backdropColor: "black",
      backdropContent: null
    };
  },

  getInitialState: function () {
    return {
      position: new Animated.Value(screen.height),
      backdropOpacity: new Animated.Value(0),
      isOpen: false,
      isAnimateClose: false,
      isAnimateOpen: false,
      swipeToClose: false,
      height: screen.height,
      width: screen.width
    };
  },

  componentDidMount: function() {
    if (this.props.swipeToClose)
      this.createPanResponder();
  },

  /****************** ANIMATIONS **********************/

  /*
   * Open animation for the backdrop, will fade in
   */
  animateBackdropOpen: function() {
    if (this.state.isAnimateBackdrop) {
      this.state.animBackdrop.stop();
      this.state.isAnimateBackdrop = false;
    }

    this.state.isAnimateBackdrop = true;
    this.state.animBackdrop = Animated.timing(
      this.state.backdropOpacity,
      {
        toValue: 1
      }
    );
    this.state.animBackdrop.start(() => {
      this.state.isAnimateBackdrop = false;
    });
  },

  /*
   * Close animation for the backdrop, will fade out
   */
  animateBackdropClose: function() {
    if (this.state.isAnimateBackdrop) {
      this.state.animBackdrop.stop();
      this.state.isAnimateBackdrop = false;
    }

    this.state.isAnimateBackdrop = true;
    this.state.animBackdrop = Animated.timing(
      this.state.backdropOpacity,
      {
        toValue: 0
      }
    );
    this.state.animBackdrop.start(() => {
      this.state.isAnimateBackdrop = false;
    });
  },

  /*
   * Open animation for the modal, will move up
   */
  animateOpen: function() {
    if (this.state.isAnimateClose) {
      this.state.animClose.stop();
      this.state.isAnimateClose = false;
    }

    // Backdrop fadeIn
    if (this.props.backdrop)
      this.animateBackdropOpen();

    // Detecting modal position
    this.state.positionDest = 0;
    if (this.props.position == "bottom") {
      this.state.positionDest = screen.height - this.state.height;
    }
    else if (this.props.position == "center") {
      this.state.positionDest = screen.height / 2 - this.state.height / 2;
    }

    this.state.isAnimateOpen = true;
    this.state.animOpen = Animated.spring(
      this.state.position,
      {
        toValue: this.state.positionDest,
        friction: 8
      }
    );
    this.state.animOpen.start(() => {
      this.state.isAnimateOpen = false;
      this.state.isOpen = true;
      if (this.props.onOpened) this.props.onOpened();
    });
  },

  /*
   * Close animation for the modal, will move down 
   */
  animateClose: function() {
    if (this.state.isAnimateOpen) {
      this.state.animOpen.stop();
      this.state.isAnimateOpen = false;
    }

    // Backdrop fadeout
    if (this.props.backdrop)
      this.animateBackdropClose();

    this.state.isAnimateClose = true;
    this.state.animClose = Animated.timing(
      this.state.position,
      {
        toValue: screen.height,
        duration: 400
      }
    );
    this.state.animClose.start(() => {
      this.state.isAnimateClose = false;
      this.state.isOpen = false;
      this.setState({});
      if (this.props.onClosed) this.props.onClosed();
    });
  },

  /*
   * Create the pan responder to detect gesture
   * Only used if swipeToClose is enabled
   */
  createPanResponder: function() {
    var closingState = false;

    var onPanRelease = (evt, state) => {
      if (state.dy > this.props.swipeThreshold)
        this.animateClose();
      else
        this.animateOpen();
    };

    var animEvt = Animated.event([null, {customY: this.state.position}]);

    var onPanMove = (evt, state) => {
      var newClosingState = (state.dy > this.props.swipeThreshold) ? true : false;
      if (state.dy < 0) return;
      if (newClosingState != closingState && this.props.onClosingState)
        this.props.onClosingState(newClosingState);
      closingState = newClosingState;
      state.customY = state.dy + this.state.positionDest;

      animEvt(evt, state);
    };

    this.state.pan = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: onPanMove,
      onPanResponderRelease: onPanRelease,
      onPanResponderTerminate: onPanRelease,
    });
  },

  /*
   * Event called when the modal view layout is calculated
   */
  onViewLayout: function(evt) {
    this.state.height = evt.nativeEvent.layout.height;
    this.state.width = evt.nativeEvent.layout.width;
    if (this.onViewLayoutCalculated) this.onViewLayoutCalculated();
  },

  /*
   * Render the backdrop element 
   */
  renderBackdrop: function() {
    var backdrop  = [];

    if (this.props.backdrop) {
      backdrop = (
        <TouchableWithoutFeedback onPress={this.animateClose}>
          <Animated.View style={[styles.backdrop, {opacity: this.state.backdropOpacity}]}>
            <View style={[styles.backdrop, {backgroundColor:this.props.backdropColor, opacity: this.props.backdropOpacity}]}/>
            {this.props.backdropContent || []}
          </Animated.View>
        </TouchableWithoutFeedback>
      );
    }

    return backdrop;
  },

  /*
   * Render the component
   */
  render: function() {
    var visible   = this.state.isOpen || this.state.isAnimateOpen || this.state.isAnimateClose;
    var pan       = this.state.pan ? this.state.pan.panHandlers : {};
    var offsetX   = (screen.width - this.state.width) / 2;
    var backdrop  = this.renderBackdrop();

    return (
      <Overlay isVisible={visible} aboveStatusBar={this.props.aboveStatusBar}>
        {backdrop}
        <Animated.View
         onLayout={this.onViewLayout}
         style={[styles.wrapper, this.props.style, {transform: [{translateY: this.state.position}, {translateX: offsetX}]} ]}
         {...pan}>
          {this.props.children}
        </Animated.View>
      </Overlay>
    );
  },

  /****************** PUBLIC METHODS **********************/

  open: function() {
    if (!this.state.isAnimateOpen) {
      this.onViewLayoutCalculated = () => {
        this.setState({});
        this.animateOpen();
      };
      this.setState({isAnimateOpen : true});
    }
  },

  close: function() {
    if (!this.state.isAnimateClose) {
      this.animateClose();
    }
  }


});

module.exports = Modal;