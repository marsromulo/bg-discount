import React from 'react'

export const FormErrorCard = ({message}) => {
  return (
    <Banner
      title="Form has error"
      status="critical"
    >
      <p>
      {{message}}
      </p>
    </Banner>
  )
}
