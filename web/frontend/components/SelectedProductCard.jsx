import React from 'react'

const SelectedProductCard = ({product}) => {

    const imgMainWrapper = {
        display:'flex', 
        marginTop:10
    }
    const imgWrapper = {
        width:50, 
        height:40, 
        display:'inline-block', 
        marginRight:20
        
    }

    const imgStyle = {
        width:'100%', 
        height:'100%', 
        objectFit:'cover'
    }

    const titleWrapper = {
        width:'100%',
        position:'relative'
    }
    const deleteBtn = {
        fontSize:24, 
        position:'absolute', 
        top:0, 
        right:0, 
        height:20, 
        width:20, 
        textAlign:'center', 
        cursor:'pointer'
    }

  return (
    <div style={imgMainWrapper}>
        <div><span style={imgWrapper}><img src={product.img_url} style={imgStyle} /></span></div>    
        <div style={titleWrapper}><span >{product.title}</span><br /><span >Sku:{product.sku}</span></div>       
    </div>

  )
}

export default SelectedProductCard