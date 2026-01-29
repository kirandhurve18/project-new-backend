pipeline{
  agent any 

  stages{
    stage("pull"){
      steps{
        git branch: 'main', credentialsId: 'a2887c96-9ca5-4a7a-8f62-709d033369af', url: 'https://github.com/kirandhurve18/project-new-backend.git'
         }
      }

  stage('Build') {
            steps { 
                withCredentials([string(credentialsId: 'dockerhub-token', variable: 'docker_hub')]) {
                sh '''
                echo "$docker_hub" | docker login -u "kirand18" --password-stdin
                docker build -t myimage:v1-latest .
                docker tag myimage:v1-latest kirand18/project-repository
                docker push kirand18/project-repository
                '''
                }                
            }
  }

  stage('Deploy') {
            steps {           
                withCredentials([file(credentialsId: 'gcp-key', variable: 'gcp_key')]) {
                sh '''
                gcloud auth activate-service-account --key-file=$gcp_key
                gcloud config set project sigma-icon-480904-m9
                gcloud container clusters get-credentials cluster-1 --zone us-central1-a --project sigma-icon-480904-m9
                kubectl apply -f K8/deployment.yaml
                kubectl apply -f K8/service.yaml
                '''
        }
    }
}
}
}
               
