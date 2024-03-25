import { View, Text, StyleSheet} from 'react-native'
import React from 'react'


const NewsPage = () => {
    return (
        <View style={StyleSheet.container}>
            <Text>News page</Text>
        </View>
    )
}
const styles = StyleSheet.create({
    container:{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
})

export default NewsPage;