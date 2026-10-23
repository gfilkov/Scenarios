GemShader = {

    uniforms: {},
    vertexShader: [
		"precision highp float;",
        "attribute vec3 instancePosition;",
        "attribute vec4 instanceQuaternion;",
        "attribute vec3 instanceScale;",
        "varying vec3 vColor;",

        "vec3 applyTRS( vec3 position, vec3 translation, vec4 quaternion, vec3 scale ) {",
          "position *= scale;",
          "position += 2.0 * cross( quaternion.xyz, cross( quaternion.xyz, position ) + quaternion.w * position );",
          "return position + translation;",
        "}",
        
        "void main(){",
          "vColor = color;",
          "vec3 transformed = applyTRS( position.xyz, instancePosition, instanceQuaternion, instanceScale );",
          "gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, 1.0 );",
        "}"
    ].join( "\n" ),

    fragmentShader: [
        "precision highp float;",
        "varying vec3 vColor;",
        "void main() {",
          "gl_FragColor = vec4( vColor, 1.0 );",
        "}"
    ].join("\n")

};