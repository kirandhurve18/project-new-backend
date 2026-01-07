pipeline{
  agent any 

stages{
  stage("pull"){
    steps{
      git branch: 'main ', credentialsId: 'git-id', url: 'https://github.com/kirandhurve18/project-new-backend.git'   
       }
    }

  stage('Build') {
            steps { 
               withCredentials([string(credentialsId: 'DOCKERHUB_TOKEN', variable: 'DOCKERHUB_TOKEN')]) {
                sh '''
                echo "$DOCKERHUB_TOKEN" | docker login -u "kirand18" --password-stdin
                docker build -t myimage:latest .
                docker tag myimage:latest kirand18/project-repository
                docker push kirand18/project-repository
                '''
                }                
            }
  }

  stage('Deploy') {
            steps {           
                withCredentials([file(credentialsId: 'gcp-key', variable: 'gcpkey')]) {
                sh '''
                gcloud auth activate-service-account --key-file=$gcpkey
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
               
