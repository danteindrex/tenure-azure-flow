
type location = "authentication"

export default function baseLogger(location:location,statement:string) {
    console.log(location,statement)
}