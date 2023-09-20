import React from 'react'
import { CollectionsFilledMajor } from '@shopify/polaris-icons'
import { Icon } from '@shopify/polaris'

const SelectedCollectionCard = ({collection}) => {

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
        display:'flex', 
        alignItems:'flex-start', 
        position:'relative',
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
        <div style={titleWrapper}>
        <div style={{width:"40px"}}>
            <Icon
            source={CollectionsFilledMajor}
            color='success'
            />
        </div>
        <span style={{fontWeight:'bold'}}>{collection.title}</span></div>       
    </div>

  )
}

export default SelectedCollectionCard